import { type Client, type Message, ChannelType, type TextChannel } from 'discord.js';
import { DynamoWatcherRepository } from '../../infrastructure/repositories/dynamo-watcher-repository';
import { docClient } from '../../infrastructure/config/aws';
import { MetlexLinkSchema, type MetlexLink } from '../../schemas/metlex-link.schema';
import type { PositionResponse } from '../../schemas/position-response.schema';
import { buildPositionImage, buildPositionMessage, buildTriggeredMessage } from '../utils/position-ui';
import { logger } from '../../shared/logger';
import type { Watcher, WatcherProps } from '../../domain/entities/watcher';
import { TakeProfitTriggerSchema } from '../../schemas/takeprofit-message.schema';
import { safePin } from '../utils/safe-pin';
import { fetchPositionData } from './closed-message.fetch';

const watcherRepo = new DynamoWatcherRepository(docClient);

export function registerClosedMessageListener(client: Client) {
  client.on('messageCreate', onMessageCreate);
}

async function onMessageCreate(message: Message) {
  try {
    if (!message.guildId || !isCandidateMessage(message)) return;

    const metlex = extractMetlexLink(message.content);
    if (!metlex) return;

    const watcher = await fetchWatcherConfig(message.guildId, message.channelId);
    if (!watcher) return;

    const position = await fetchPositionData(metlex.hash);

    const previousMessage = await getPreviousMessage(message);
    await replyWithPosition(message, previousMessage, watcher, position);
  } catch (err) {
    logger.error('closed-message listener failed', err instanceof Error ? err : new Error(String(err)));
  }
}

export function isCandidateMessage(message: Message): boolean {
  // const fromBotButNotWebhook = message.author.bot && !message.webhookId;
  const fromBotButNotWebhook = true; // TODO dev mode
  return (
    fromBotButNotWebhook &&
    message.guildId !== null &&
    message.channel.type === ChannelType.GuildText &&
    message.content.trim().startsWith('🟨Closed')
  );
}

export function extractMetlexLink(content: string): MetlexLink | null {
  const result = MetlexLinkSchema.safeParse(content);
  return result.success ? result.data : null;
}

async function fetchWatcherConfig(guildId: string, channelId: string): Promise<Watcher | null> {
  try {
    const w = await watcherRepo.findByGuildAndChannel(guildId, channelId);
    return w?.followed ? w : null;
  } catch (err) {
    logger.error('DB error fetching watcher', err instanceof Error ? err : new Error(String(err)));
    return null;
  }
}

export async function replyWithPosition(
  message: Message,
  previousMessage: Message | null,
  watcher: WatcherProps,
  response: PositionResponse,
): Promise<void> {
  const channel = message.channel as TextChannel;

  let mention = '';
  let allowedMentions: { users?: string[]; roles?: string[] } | undefined;

  if (watcher.tagId) {
    if (watcher.tagType === 'USER') {
      mention = `<@${watcher.tagId}> `;
      allowedMentions = { users: [watcher.tagId] };
    } else {
      mention = `<@&${watcher.tagId}> `;
      allowedMentions = { roles: [watcher.tagId] };
    }
  }

  let contentBody: string;
  if (previousMessage) {
    const parsed = TakeProfitTriggerSchema.safeParse(previousMessage.content);
    contentBody = parsed.success ? buildTriggeredMessage(response, parsed.data) : buildPositionMessage(response);
  } else {
    contentBody = buildPositionMessage(response);
  }

  const content = mention + contentBody;

  const files = watcher.image
    ? [{ attachment: await buildPositionImage(response), name: `${response.data.position}.png` }]
    : undefined;

  const sent = await channel.send({
    content,
    ...(files && { files }),
    allowedMentions,
  });

  if (watcher.pin) {
    await safePin(sent);
  }
}

/**
 * Fetch the single message immediately before `message` in its channel,
 * or null if none or on error.
 */
export async function getPreviousMessage(message: Message): Promise<Message | null> {
  if (message.channel.type !== ChannelType.GuildText) return null;
  try {
    const msgs = await (message.channel as TextChannel).messages.fetch({
      before: message.id,
      limit: 1,
    });
    return msgs.first() ?? null;
  } catch (err) {
    logger.warn('Failed to fetch previous message', {
      error: err instanceof Error ? err : new Error(String(err)),
    });
    return null;
  }
}
