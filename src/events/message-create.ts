import { ChannelService } from '@services/channel-service';
import type { Message } from 'discord.js';

const service = new ChannelService();

export async function messageCreate(message: Message): Promise<void> {
  if (service.shouldProcessMessage(message)) {
    await service.pinIfNotPinned(message);
  }
}
