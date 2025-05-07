import { ChannelRepository } from '@repositories/channel-repository';
import type { ChannelSettings } from '@type/channel-settings';
import { EmbedBuilder, TextChannel, type Message, MessageType } from 'discord.js';
import { logger, MessageError, ApiError } from '../utils';

export class MessageProcessor {
  private static readonly MAX_PINS = 45;

  public static async pinIfNotPinned(message: Message): Promise<void> {
    try {
      if (!this.isValidAttachment(message)) {
        logger.debug('Skipping message with no valid attachments', {
          messageId: message.id,
          channelId: message.channelId,
        });
        return;
      }

      const channel = message.channel as TextChannel;
      const guildId = channel.guildId!;
      const chanId = channel.id;

      logger.debug('Processing attachment for pinning', {
        messageId: message.id,
        channelId: chanId,
        guildId,
      });

      const settings = ChannelRepository.getInstance().getChannelSettings(guildId, chanId);

      try {
        const prevMsg = await this.fetchPreviousMessage(channel, message.id);
        if (!prevMsg) {
          logger.debug('No previous message found, skipping', { messageId: message.id });
          return;
        }

        const description = this.getDescription(prevMsg.content.trim());
        if (!description) {
          logger.debug('No valid description in previous message, skipping', {
            messageId: message.id,
            prevMessageId: prevMsg.id,
            prevContent: prevMsg.content.substring(0, 50),
          });
          return;
        }

        await this.managePinnedMessages(channel);

        const pinned = await this.sendPin(channel, settings, description, message.attachments.first()!.url);

        await this.removeSystemPinMessage(channel, pinned.id);

        logger.info('Successfully pinned message', {
          pinnedMessageId: pinned.id,
          originalMessageId: message.id,
          channelId: chanId,
        });
      } catch (error) {
        logger.error(
          'Error processing message for pinning',
          error instanceof Error ? error : new Error('Unknown error'),
          {
            messageId: message.id,
            channelId: chanId,
            guildId,
          },
        );
        throw new MessageError(`Failed to process message ${message.id} for pinning`);
      }
    } catch (error) {
      logger.error('Top-level error in pinIfNotPinned', error instanceof Error ? error : new Error('Unknown error'), {
        messageId: message.id,
      });
    }
  }

  private static isValidAttachment(message: Message): boolean {
    return message.channel instanceof TextChannel && message.attachments.size > 0;
  }

  private static async fetchPreviousMessage(channel: TextChannel, beforeId: string): Promise<Message | null> {
    try {
      logger.debug('Fetching previous message', { channelId: channel.id, beforeId });
      const fetched = await channel.messages.fetch({ before: beforeId, limit: 1 });
      const msg = fetched.first() ?? null;

      logger.debug('Previous message fetch result', {
        channelId: channel.id,
        found: !!msg,
        messageId: msg?.id,
      });

      return msg;
    } catch (error) {
      logger.error('Error fetching previous message', error instanceof Error ? error : new Error('Unknown error'), {
        channelId: channel.id,
        beforeId,
      });
      throw new ApiError(`Failed to fetch previous message before ${beforeId}`);
    }
  }

  private static async sendPin(
    channel: TextChannel,
    settings: ChannelSettings,
    description: string,
    imageUrl: string,
  ): Promise<Message> {
    try {
      logger.debug('Sending pin message', {
        channelId: channel.id,
        imageUrl: imageUrl.substring(0, 100),
        settings,
      });

      const tagPrefix = settings.tag
        ? settings.tag.type === 'role'
          ? `<@&${settings.tag.id}> `
          : `<@${settings.tag.id}> `
        : '';

      let sent: Message;

      if (settings.image) {
        const embed = new EmbedBuilder().setDescription(description).setImage(imageUrl);
        sent = await channel.send({ content: tagPrefix, embeds: [embed] });
      } else {
        sent = await channel.send({ content: `${tagPrefix}${description}` });
      }

      try {
        await sent.pin();
        logger.debug('Message pinned successfully', {
          channelId: channel.id,
          messageId: sent.id,
        });
        return sent;
      } catch (pinError) {
        logger.error('Failed to pin message', pinError instanceof Error ? pinError : new Error('Unknown error'), {
          channelId: channel.id,
          messageId: sent.id,
        });
        throw new ApiError('Failed to pin message - possibly hit pin limit');
      }
    } catch (error) {
      logger.error('Error sending pin', error instanceof Error ? error : new Error('Unknown error'), {
        channelId: channel.id,
      });
      throw new ApiError('Failed to send or pin message');
    }
  }

  private static async removeSystemPinMessage(channel: TextChannel, pinnedMessageId: string): Promise<void> {
    try {
      logger.debug('Attempting to remove system pin message', {
        channelId: channel.id,
        pinnedMessageId,
      });

      const around = await channel.messages.fetch({ around: pinnedMessageId, limit: 5 });
      const systemMsg = around.find((m) => m.type === MessageType.ChannelPinnedMessage && m.id !== pinnedMessageId);

      if (systemMsg) {
        await systemMsg.delete();
        logger.debug('Removed system pin notification', {
          channelId: channel.id,
          systemMessageId: systemMsg.id,
        });
      } else {
        logger.debug('No system pin message found to remove', {
          channelId: channel.id,
          pinnedMessageId,
        });
      }
    } catch (error) {
      logger.warn('Error removing system pin message', {
        channelId: channel.id,
        pinnedMessageId,
      });
    }
  }

  private static async managePinnedMessages(channel: TextChannel): Promise<void> {
    try {
      logger.debug('Managing pinned messages to stay within limit', {
        channelId: channel.id,
        maxPins: this.MAX_PINS,
      });

      const pinned = await channel.messages.fetchPinned();

      logger.debug('Current pin count', {
        channelId: channel.id,
        count: pinned.size,
        limit: this.MAX_PINS,
      });

      if (pinned.size >= this.MAX_PINS) {
        const oldest = pinned.last();
        if (oldest) {
          await oldest.unpin();
          logger.info('Unpinned oldest message to stay within limit', {
            channelId: channel.id,
            messageId: oldest.id,
          });
        }
      }
    } catch (error) {
      logger.error('Error managing pinned messages', error instanceof Error ? error : new Error('Unknown error'), {
        channelId: channel.id,
      });
    }
  }

  private static getDescription(content: string): string | null {
    try {
      const exact = ['🛑Stop loss', '🎯Take profit'];
      for (const prefix of exact) {
        if (content.startsWith(prefix)) {
          logger.debug('Found exact match in description', { prefix });
          return content;
        }
      }

      return this.parseSquareMessage(content);
    } catch (error) {
      logger.error('Error parsing description', error instanceof Error ? error : new Error('Unknown error'), {
        content: content.substring(0, 50),
      });
      return null;
    }
  }

  private static parseSquareMessage(content: string): string | null {
    try {
      const squares = ['🟩', '🟥', '🟨'];
      for (const square of squares) {
        if (content.startsWith(square)) {
          logger.debug('Found square emoji in message', {
            square,
            content: content.substring(0, 50),
          });

          const m = content.match(/Return:\s*([+-]?\d+\.\d+)%/);
          if (m) {
            const pct = Number.parseFloat(m[1]);
            logger.debug('Parsed return percentage', { percentage: pct });

            if (pct > 0) return `🟢 Position closed: +${pct}% profit`;
            if (pct < 0) return `🔴 Position closed: ${pct}% loss`;
            return '⚪ Position closed: 0% change';
          }
          return '⚫ Position closed: PnL unavailable';
        }
      }

      logger.debug('No matching pattern found in content', {
        contentStart: content.substring(0, 30),
      });

      return null;
    } catch (error) {
      logger.error('Error parsing square message', error instanceof Error ? error : new Error('Unknown error'), {
        content: content.substring(0, 50),
      });
      return null;
    }
  }
}
