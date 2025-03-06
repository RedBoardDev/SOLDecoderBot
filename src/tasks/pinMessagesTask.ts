import { Client, TextChannel } from 'discord.js';
import { Task } from '.';
import { Logger } from '../utils/logger';
import { config } from '../config';
import { pinMessagesOldToNew } from '../features/pinMessages';

export class PinMessagesTask extends Task {
  private readonly client: Client;

  constructor(client: Client, logger: Logger) {
    super('PinMessagesTask', logger);
    this.client = client;
  }

  protected async execute(): Promise<void> {
    const pinTasks = config.channelIds.map(async (channelId) => {
      const channel = this.client.channels.cache.get(channelId) as TextChannel;
      if (channel) {
        await pinMessagesOldToNew(channel, this.logger);
        await this.logger.info(`Épinglage terminé pour le channel : ${channel.name}`);
      } else {
        await this.logger.error(`Channel introuvable : ${channelId}`);
      }
    });

    await Promise.all(pinTasks);
  }
}