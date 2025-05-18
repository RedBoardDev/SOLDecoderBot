import type { TextChannel, Message } from 'discord.js';

/**
 * Pin a message in a channel, ensuring we never exceed Discord’s 50-pin limit.
 * If already at limit, it unpins the oldest message first.
 * Then it removes the "pinned a message to this channel" system notification.
 */
export async function safePin(message: Message, maxPins = 50): Promise<void> {
  const channel = message.channel;

  if (channel.type !== 0) {
    await message.pin();
    return;
  }

  const textChannel = channel as TextChannel;

  const pinned = await textChannel.messages.fetchPinned();

  if (pinned.size >= maxPins) {
    const oldest = pinned.sort((a, b) => a.createdTimestamp - b.createdTimestamp).first();
    if (oldest) {
      await oldest.unpin();
    }
  }

  await message.pin();
  try {
    const recent = await textChannel.messages.fetch({ limit: 5 });
    for (const sysMsg of recent.values()) {
      if (sysMsg.type === 6 && sysMsg.reference?.messageId === message.id) {
        await sysMsg.delete();
      }
    }
  } catch (_err) {}
}
