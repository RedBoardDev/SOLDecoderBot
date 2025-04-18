import { ChannelRepository } from '@repositories/channel-repository';
import type { GuildMember, TextChannel, Message, TextBasedChannel } from 'discord.js';
import { MessageProcessor } from './message-processor';

export class ChannelService {
  private readonly repository: ChannelRepository;

  constructor() {
    this.repository = ChannelRepository.getInstance();
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

  public async fetchChannelWithPermissions(
    channelId: string,
    botMember: GuildMember,
    requiredPermissions: bigint,
  ): Promise<TextChannel | null> {
    try {
      const channel = await botMember.guild.channels.fetch(channelId);
      if (channel?.isTextBased() && botMember.permissionsIn(channel).has(requiredPermissions)) {
        return channel as TextChannel;
      }
    } catch (error) {
      console.error(`Error fetching channel ${channelId}:`, error);
    }
    return null;
  }

  public shouldProcessMessage(message: Message, ignoreMonitoring = false): boolean {
    if (message.author.id === message.client.user?.id) return false;
    if (!message.guildId || !message.channelId) return false;
    if (!ignoreMonitoring) {
      const monitoredChannels = this.getMonitoredChannels(message.guildId);
      if (!monitoredChannels.includes(message.channelId)) return false;
    }
    return message.attachments.size > 0;
  }

  public async processExistingMessages(
    channel: TextBasedChannel,
    limit = 10_000,
    ignoreMonitoring = false,
  ): Promise<void> {
    try {
      let messages: Message[] = [];
      let lastId: string | undefined;

      while (messages.length < limit) {
        const fetched = await channel.messages.fetch({ limit: 100, before: lastId });
        if (fetched.size === 0) break;
        messages = messages.concat(Array.from(fetched.values()));
        lastId = fetched.last()?.id;
        if (messages.length >= limit) break;
      }

      messages = messages.slice(0, limit);
      console.log(`Fetched ${messages.length} messages from channel ${channel.id}`);

      let processedCount = 0;
      for (const message of messages) {
        if (this.shouldProcessMessage(message, ignoreMonitoring)) {
          await MessageProcessor.pinIfNotPinned(message);
          processedCount++;
        }
      }
      console.log(`Processed ${processedCount} messages in channel ${channel.id}`);
    } catch (error) {
      console.error(`Error processing messages in channel ${channel.id}:`, error);
    }
  }

  public async unpinExistingMessages(channel: TextChannel, limit = 10_000): Promise<void> {
    try {
      const pinnedMessages = await channel.messages.fetchPinned();
      const pinnedArray = Array.from(pinnedMessages.values()).slice(0, limit);
      for (const pinnedMessage of pinnedArray) {
        await pinnedMessage.unpin();
      }
    } catch (error) {
      console.error(`Error unpinning messages in channel ${channel.id}:`, error);
    }
  }
}
