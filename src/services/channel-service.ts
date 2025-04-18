import { ChannelRepository } from '@repositories/channel-repository';
import { type Config, loadConfig } from '@utils/config-loader';
import type { Message, TextBasedChannel } from 'discord.js';

export class ChannelService {
  private readonly repository: ChannelRepository;
  private readonly config: Config;

  constructor() {
    this.repository = ChannelRepository.getInstance();
    this.config = loadConfig();
  }

  public addChannel(guildId: string, channelId: string): void {
    this.repository.addChannel(guildId, channelId);
  }

  public removeChannel(guildId: string, channelId: string): void {
    this.repository.removeChannel(guildId, channelId);
  }

  public getMonitoredChannels(guildId: string): string[] {
    return this.repository.getMonitoredChannels(guildId);
  }

  public shouldProcessMessage(message: Message): boolean {
    if (message.author.id === message.client.user?.id) return false;
    const guildId = message.guildId;
    const channelId = message.channelId;
    if (!guildId) return false;
    const monitoredChannels = this.getMonitoredChannels(guildId);
    if (!monitoredChannels.includes(channelId)) return false;
    const content = message.content.trim();
    return this.config.matchPrefixes.some((prefix) => content.startsWith(prefix));
  }

  public async pinIfNotPinned(message: Message): Promise<void> {
    if (!(await this.isPinned(message))) {
      await message.pin();
      console.log(`Message épinglé : ${message.id} dans ${message.channelId}`);
    }
  }

  private async isPinned(message: Message): Promise<boolean> {
    const pinnedMessages = await message.channel.messages.fetchPinned();
    return pinnedMessages.has(message.id);
  }

  public async processExistingMessages(channel: TextBasedChannel, limit = 10000): Promise<void> {
    let messages: Message[] = [];
    let lastId: string | undefined;

    while (messages.length < limit) {
      const fetched = await channel.messages.fetch({
        limit: 100,
        before: lastId,
      });
      if (fetched.size === 0) break;
      messages = messages.concat(Array.from(fetched.values()));
      lastId = fetched.last()?.id;
      if (messages.length >= limit) break;
    }

    messages = messages.slice(0, limit);
    for (const message of messages) {
      if (this.shouldProcessMessage(message)) {
        await this.pinIfNotPinned(message);
      }
    }
  }
}
