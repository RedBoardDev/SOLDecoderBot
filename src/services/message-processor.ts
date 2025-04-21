import { EmbedBuilder, TextChannel, type Message } from 'discord.js';

export class MessageProcessor {
  private static readonly MAX_PINS = 45; // Maximum number of pins to maintain (buffer to avoid hitting 50)

  public static async pinIfNotPinned(message: Message): Promise<void> {
    if (!(message.channel instanceof TextChannel) || message.attachments.size === 0) return;

    const imageUrl = message.attachments.first()?.url;
    if (!imageUrl) return;

    try {
      const previousMessages = await message.channel.messages.fetch({ before: message.id, limit: 1 });
      const previousMessage = previousMessages.first();
      if (!previousMessage) return;

      const description = this.getDescription(previousMessage.content.trim());
      if (description) {
        // Check pinned message count and remove oldest if necessary
        await this.managePinnedMessages(message.channel);

        const embed = new EmbedBuilder().setDescription(description).setImage(imageUrl);
        const newMessage = await message.channel.send({ embeds: [embed] });
        await newMessage.pin();
        console.log(`Embed pinned: ${newMessage.id} in ${message.channelId}`);
      }
    } catch (error) {
      console.error(`Error pinning message in channel ${message.channelId}:`, error);
    }
  }

  private static async managePinnedMessages(channel: TextChannel): Promise<void> {
    try {
      const pinnedMessages = await channel.messages.fetchPinned();
      if (pinnedMessages.size >= this.MAX_PINS) {
        // The oldest pinned message is the last one in the collection (least recently pinned)
        const oldestMessage = pinnedMessages.last();
        if (oldestMessage) {
          await oldestMessage.unpin();
          console.log(`Unpinned oldest pinned message ${oldestMessage.id} in channel ${channel.id}`);
        }
      }
    } catch (error) {
      console.error(`Error managing pinned messages in channel ${channel.id}:`, error);
    }
  }

  private static getDescription(content: string): string | null {
    const matchPrefixes = ['🛑Stop loss', '🎯Take profit'];
    for (const prefix of matchPrefixes) {
      if (content.startsWith(prefix)) return content;
    }
    return this.parseSquareMessage(content);
  }

  private static parseSquareMessage(content: string): string | null {
    const squarePrefixes = ['🟩', '🟥', '🟨'];
    for (const square of squarePrefixes) {
      if (content.startsWith(square)) {
        const returnMatch = content.match(/Return:\s*([+-]?\d+\.\d+)%/);
        if (returnMatch) {
          const percentage = Number.parseFloat(returnMatch[1]);
          if (percentage > 0) return `🟢 Position closed: +${percentage}% profit`;
          if (percentage < 0) return `🔴 Position closed: ${percentage}% loss`;
          return '⚪ Position closed: 0% change';
        }
        return '⚫ Position closed: PnL unavailable';
      }
    }
    return null;
  }
}