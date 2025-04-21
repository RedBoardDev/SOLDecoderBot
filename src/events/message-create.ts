import { ChannelService } from '@services/channel-service';
import { MessageProcessor } from '@services/message-processor';
import type { Message } from 'discord.js';
import { logger, handleMessageError } from '../utils';

const service = new ChannelService();

export async function messageCreate(message: Message): Promise<void> {
  try {
    if (message.author.bot) return;

    logger.debug('Processing message event', {
      messageId: message.id,
      channelId: message.channelId,
      authorId: message.author.id,
    });

    if (service.shouldProcessMessage(message)) {
      logger.debug('Message qualifies for processing', { messageId: message.id });
      await MessageProcessor.pinIfNotPinned(message);
      logger.debug('Message processing completed', { messageId: message.id });
    }
  } catch (error) {
    await handleMessageError(error, message);
  }
}
