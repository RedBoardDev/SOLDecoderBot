import { ChannelRepository } from '@repositories/channel-repository';
import { ChannelSettings } from '@type/channel-settings';
import {
  EmbedBuilder,
  TextChannel,
  type Message,
  MessageType,
} from 'discord.js';

export class MessageProcessor {
  private static readonly MAX_PINS = 45;

  public static async pinIfNotPinned(message: Message): Promise<void> {
    if (!this.isValidAttachment(message)) return;

    const channel = message.channel as TextChannel;
    const guildId = channel.guildId!;
    const chanId = channel.id;
    const settings = ChannelRepository.getInstance().getChannelSettings(guildId, chanId);

    try {
      const prevMsg = await this.fetchPreviousMessage(channel, message.id);
      if (!prevMsg) return;

      const description = this.getDescription(prevMsg.content.trim());
      if (!description) return;

      await this.managePinnedMessages(channel);

      const pinned = await this.sendPin(channel, settings, description, message.attachments.first()!.url);
      await this.removeSystemPinMessage(channel, pinned.id);

      console.log(`Pinned message ${pinned.id} in ${chanId}`);
    } catch (error) {
      console.error(`Error in pinIfNotPinned for ${chanId}:`, error);
    }
  }

  private static isValidAttachment(message: Message): boolean {
    return (
      message.channel instanceof TextChannel &&
      message.attachments.size > 0
    );
  }

  private static async fetchPreviousMessage(
    channel: TextChannel,
    beforeId: string
  ): Promise<Message | null> {
    const fetched = await channel.messages.fetch({ before: beforeId, limit: 1 });
    return fetched.first() ?? null;
  }

  private static async sendPin(
    channel: TextChannel,
    settings: ChannelSettings,
    description: string,
    imageUrl: string
  ): Promise<Message> {
    const tagPrefix = settings.tag
      ? settings.tag.type === 'role'
        ? `<@&${settings.tag.id}> `
        : `<@${settings.tag.id}> `
      : '';

    if (settings.image) {
      const embed = new EmbedBuilder()
        .setDescription(description)
        .setImage(imageUrl);
      const sent = await channel.send({ content: tagPrefix, embeds: [embed] });
      await sent.pin();
      return sent;
    } else {
      const sent = await channel.send({ content: `${tagPrefix}${description}` });
      await sent.pin();
      return sent;
    }
  }

  private static async removeSystemPinMessage(
    channel: TextChannel,
    pinnedMessageId: string
  ): Promise<void> {
    try {
      const around = await channel.messages.fetch({ around: pinnedMessageId, limit: 5 });
      const systemMsg = around.find(
        (m) =>
          m.type === MessageType.ChannelPinnedMessage &&
          m.id !== pinnedMessageId
      );
      if (systemMsg) {
        await systemMsg.delete();
        console.log(`Removed system pin notification ${systemMsg.id}`);
      }
    } catch (error) {
      console.error(`Error removing system pin message in ${channel.id}:`, error);
    }
  }

  private static async managePinnedMessages(channel: TextChannel): Promise<void> {
    try {
      const pinned = await channel.messages.fetchPinned();
      if (pinned.size >= this.MAX_PINS) {
        const oldest = pinned.last();
        if (oldest) {
          await oldest.unpin();
          console.log(`Unpinned oldest pinned message ${oldest.id}`);
        }
      }
    } catch (error) {
      console.error(`Error managing pinned messages in ${channel.id}:`, error);
    }
  }

  private static getDescription(content: string): string | null {
    const exact = ['🛑Stop loss', '🎯Take profit'];
    for (const prefix of exact) {
      if (content.startsWith(prefix)) return content;
    }
    return this.parseSquareMessage(content);
  }

  private static parseSquareMessage(content: string): string | null {
    const squares = ['🟩', '🟥', '🟨'];
    for (const square of squares) {
      if (content.startsWith(square)) {
        const m = content.match(/Return:\s*([+-]?\d+\.\d+)%/);
        if (m) {
          const pct = parseFloat(m[1]);
          if (pct > 0) return `🟢 Position closed: +${pct}% profit`;
          if (pct < 0) return `🔴 Position closed: ${pct}% loss`;
          return '⚪ Position closed: 0% change';
        }
        return '⚫ Position closed: PnL unavailable';
      }
    }
    return null;
  }
}
