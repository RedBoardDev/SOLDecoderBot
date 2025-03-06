import { TextChannel, Message } from "discord.js";
import { config } from "../config";
import { Logger } from "../utils/logger";

const shouldPinMessage = (content: string): boolean => {
  return config.matchPrefixes.some((prefix) => content.startsWith(prefix));
};

export const pinMessagesOldToNew = async (
  channel: TextChannel,
  logger: Logger
): Promise<void> => {
  try {
    let lastMessageId: string | undefined;
    const messagesToPin: string[] = [];

    while (true) {
      const messages = await channel.messages.fetch({
        limit: 100,
        before: lastMessageId,
      });

      if (messages.size === 0) break;

      messages.forEach((message: Message) => {
        if (shouldPinMessage(message.content) && !message.pinned) {
          messagesToPin.push(message.id);
        }
      });

      lastMessageId = messages.last()?.id;
    }

    for (const messageId of messagesToPin.reverse()) {
      const message = await channel.messages.fetch(messageId);
      await message.pin();
      await logger.info(`Pinned message: "${message.content}"`);
    }
  } catch (error) {
    await logger.error(`Error while pinning messages: ${error}`);
  }
};

export const handleMessageCreate = async (message: Message, logger: Logger) => {
  if (
    config.channelIds.includes(message.channel.id) &&
    shouldPinMessage(message.content) &&
    !message.pinned
  ) {
    try {
      await message.pin();
      await logger.info(`Pinned a message: "${message.content}"`);
    } catch (error) {
      await logger.error(`Failed to pin message: ${error}`);
    }
  }
};
