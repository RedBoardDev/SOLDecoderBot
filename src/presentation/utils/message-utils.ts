import { ChannelType, type TextChannel, type Message } from 'discord.js';
import { MessageDataSchema, type MessageData } from '../../schemas/message-data.schema';
import { logger } from '../../shared/logger';

export function isCandidateMessage(message: Message): boolean {
  const fromBotButNotWebhook = true; // TODO dev mode
  return (
    fromBotButNotWebhook &&
    message.guildId !== null &&
    message.channel.type === ChannelType.GuildText &&
    message.content.trim().startsWith('🟨Closed')
  );
}

export function extractDataFromMessage(content: string): MessageData | null {
  const result = MessageDataSchema.safeParse(content);
  return result.success ? result.data : null;
}

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
