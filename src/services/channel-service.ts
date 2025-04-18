import { ChannelRepository } from '@repositories/channel-repository';
import { EmbedBuilder, TextChannel, type Message, type TextBasedChannel } from 'discord.js';

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

  public shouldProcessMessage(message: Message): boolean {
    if (message.author.id === message.client.user?.id) return false;
    const guildId = message.guildId;
    const channelId = message.channelId;
    if (!guildId) return false;
    const monitoredChannels = this.getMonitoredChannels(guildId);
    if (!monitoredChannels.includes(channelId)) return false;
    const hasImage = message.attachments.size > 0;
    return hasImage;
  }

  public async pinIfNotPinned(message: Message): Promise<void> {
    const hasImage = message.attachments.size > 0;
    if (hasImage && message.channel instanceof TextChannel) {
      const imageUrl = message.attachments.first()?.url;
      if (imageUrl) {
        const previousMessages = await message.channel.messages.fetch({
          before: message.id,
          limit: 1,
        });
        const previousMessage = previousMessages.first();
        if (previousMessage) {
          const content = previousMessage.content.trim();
          const description = this.getDescription(content);
          if (description) {
            const embed = new EmbedBuilder().setDescription(description).setImage(imageUrl);
            const newMessage = await message.channel.send({ embeds: [embed] });
            await newMessage.pin();
            console.log(`Embed pinned: ${newMessage.id} in ${message.channelId}`);
          }
        }
      }
    }
  }

  private getDescription(content: string): string | null {
    const matchPrefixes = ['🛑Stop loss', '🎯Take profit'];
    for (const prefix of matchPrefixes) {
      if (content.startsWith(prefix)) {
        return content;
      }
    }

    return this.parseSquareMessage(content);
  }

  private parseSquareMessage(content: string): string | null {
    const squarePrefixes = ['🟩', '🟥', '🟨'];
    for (const square of squarePrefixes) {
      console.log('t0', content);
      console.log('t1', content.startsWith(square));
      if (content.startsWith(square)) {
        const returnMatch = content.match(/Return:\s*([+-]?\d+\.\d+)%/);
        if (returnMatch) {
          const percentage = Number.parseFloat(returnMatch[1]);
          if (percentage > 0) {
            return `🟢 Position closed: +${percentage}% profit`;
          }
          if (percentage < 0) {
            return `🔴 Position closed: ${percentage}% loss`;
          }
          return '⚪ Position closed: 0% change';
        }
        return '⚫ Position closed: PnL unavailable';
      }
    }
    return null;
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
