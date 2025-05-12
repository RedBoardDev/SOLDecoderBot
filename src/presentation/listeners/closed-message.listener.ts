import type { Message, Client, TextChannel } from 'discord.js';
import { DynamoWalletWatchRepository } from '../../infrastructure/repositories/dynamo-wallet-watch-repository';
import { logger } from '../../shared/logger';
import { extractDataFromMessage, getPreviousMessage, isCandidateMessage } from '../utils/message-utils';
import { PositionFetcher } from '../../infrastructure/services/position-fetcher';
import { aggregatePositions } from '../utils/aggregate-positions';
import type { PositionResponse } from '../../schemas/position-response.schema';
import { type TakeProfitTrigger, TakeProfitTriggerSchema } from '../../schemas/takeprofit-message.schema';
import { buildPositionImage, buildPositionMessage, buildTriggeredMessage } from '../utils/position-ui';
import { safePin } from '../utils/safe-pin';
import type { WalletWatch } from '../../domain/entities/wallet-watch';

export function registerClosedMessageListener(client: Client) {
  client.on('messageCreate', onMessageCreate);
}

async function onMessageCreate(message: Message) {
  try {
    if (!message.guildId) return;
    if (!isCandidateMessage(message)) return;

    const data = extractDataFromMessage(message.content);
    if (!data) return;
    const { walletPrefix, hashs } = data;

    const repo = new DynamoWalletWatchRepository();
    const watchers = await repo.listByChannelAndWalletPrefixAndNotify(message.channelId, walletPrefix);
    if (!watchers || watchers.length === 0) return;

    const fetcher = PositionFetcher.getInstance();
    const positions = await fetcher.fetchPositions(hashs);

    const aggregated = aggregatePositions(positions);

    const previousMessage = await getPreviousMessage(message);

    for (const watcher of watchers) {
      await replyWithPosition(message, previousMessage, watcher, aggregated);
    }
  } catch (err) {
    logger.error('closed-message listener failed', err instanceof Error ? err : new Error(String(err)));
  }
}

export async function replyWithPosition(
  message: Message,
  previousMessage: Message | null,
  watcher: WalletWatch,
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
  let triggerData: TakeProfitTrigger | null = null;

  if (previousMessage) {
    const parsed = TakeProfitTriggerSchema.safeParse(previousMessage.content);
    if (parsed.success) {
      triggerData = parsed.data;
      contentBody = buildTriggeredMessage(response, triggerData);
    } else {
      contentBody = buildPositionMessage(response);
    }
  } else {
    contentBody = buildPositionMessage(response);
  }

  const content = mention + contentBody;

  const files = watcher.image
    ? [
        {
          attachment: await buildPositionImage(response, !!triggerData),
          name: `${response.data.position}.png`,
        },
      ]
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
