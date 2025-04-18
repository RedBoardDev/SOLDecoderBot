import { EmbedBuilder, TextChannel, type Message } from 'discord.js';

export class MessageProcessor {
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
        const embed = new EmbedBuilder().setDescription(description).setImage(imageUrl);
        const newMessage = await message.channel.send({ embeds: [embed] });
        await newMessage.pin();
        console.log(`Embed pinned: ${newMessage.id} in ${message.channelId}`);
      }
    } catch (error) {
      console.error(`Error pinning message in channel ${message.channelId}:`, error);
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
