import { ChannelRepository, ChannelSettings } from '@repositories/channel-repository';
import type { GuildMember, TextChannel, Message, TextBasedChannel } from 'discord.js';
import { MessageProcessor } from './message-processor';

export class ChannelService {
  private repo = ChannelRepository.getInstance();

  public addChannel(guildId: string, channelId: string, settings?: Partial<ChannelSettings>) {
    this.repo.addChannel(guildId, channelId, settings);
  }

  public getMonitoredChannels(guildId: string): string[] {
    return this.repo.getMonitoredChannels(guildId);
  }

  public getChannelSettings(
    guildId: string,
    channelId: string
  ): ChannelSettings {
    return this.repo.getChannelSettings(guildId, channelId);
  }

  public updateSettings(
    guildId: string,
    channelId: string,
    settings: Partial<ChannelSettings>
  ): void {
    this.repo.updateChannelSettings(guildId, channelId, settings);
  }

  public removeChannel(guildId: string, channelId: string): void {
    this.repo.removeChannel(guildId, channelId);
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

      messages = messages.slice(0, limit).reverse(); // Reverse to process from oldest to newest
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
      throw error; // Propagate error to caller
    }
  }

  public async deleteBotMessages(channel: TextChannel, limit: number = 10_000): Promise<void> {
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
      const botMessages = messages.filter((msg) => msg.author.id === channel.client.user?.id);

      for (const msg of botMessages) {
        await msg.delete();
      }
      console.log(`Deleted ${botMessages.length} bot messages in channel ${channel.id}`);
    } catch (error) {
      console.error(`Error deleting bot messages in channel ${channel.id}:`, error);
      throw error;
    }
  }

  /**
   * Ensures the number of pinned messages does not exceed the specified limit.
   * If the limit is reached or exceeded, unpins the oldest pinned message.
   * @param channel The channel to manage pins for
   * @param maxPins Maximum number of pins allowed
   */
  public async managePinLimit(channel: TextChannel, maxPins: number): Promise<void> {
    try {
      const pinnedMessages = await channel.messages.fetchPinned();
      if (pinnedMessages.size >= maxPins) {
        // Find the oldest pinned message (highest ID, as IDs increase over time)
        const oldestPin = pinnedMessages.reduce((oldest, current) =>
          BigInt(current.id) < BigInt(oldest.id) ? current : oldest
        );
        await oldestPin.unpin();
        console.log(`Unpinned oldest message ${oldestPin.id} to maintain pin limit in channel ${channel.id}`);
      }
    } catch (error) {
      console.error(`Error managing pin limit in channel ${channel.id}:`, error);
    }
  }
}