import { ChannelService } from '@services/channel-service';
import { MessageProcessor } from '@services/message-processor';
import type { Message } from 'discord.js';

const service = new ChannelService();

export async function messageCreate(message: Message): Promise<void> {
  if (service.shouldProcessMessage(message)) {
    await MessageProcessor.pinIfNotPinned(message);
  }
}
