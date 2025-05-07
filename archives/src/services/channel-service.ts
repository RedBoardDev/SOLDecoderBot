import { ChannelRepository } from '@repositories/channel-repository';
import type { GuildMember, TextChannel, Message, TextBasedChannel } from 'discord.js';
import { MessageProcessor } from './message-processor';
import type { ChannelSettings } from '@type/channel-settings';
import { logger, ChannelError, ApiError } from '../utils';

export class ChannelService {
  private repo = ChannelRepository.getInstance();

  public addChannel(guildId: string, channelId: string, settings?: Partial<ChannelSettings>) {
    try {
      logger.debug('Adding channel to monitoring service', { guildId, channelId });
      this.repo.addChannel(guildId, channelId, settings);
    } catch (error) {
      logger.error('Error in addChannel service', error instanceof Error ? error : new Error('Unknown error'), {
        guildId,
        channelId,
      });
      throw error;
    }
  }

  public getMonitoredChannels(guildId: string): string[] {
    try {
      return this.repo.getMonitoredChannels(guildId);
    } catch (error) {
      logger.error('Error fetching monitored channels', error instanceof Error ? error : new Error('Unknown error'), {
        guildId,
      });
      return [];
    }
  }

  public getChannelSettings(guildId: string, channelId: string): ChannelSettings {
    try {
      return this.repo.getChannelSettings(guildId, channelId);
    } catch (error) {
      logger.error('Error fetching channel settings', error instanceof Error ? error : new Error('Unknown error'), {
        guildId,
        channelId,
      });
      return { image: false, tag: false };
    }
  }

  public updateSettings(guildId: string, channelId: string, settings: Partial<ChannelSettings>): void {
    try {
      logger.debug('Updating channel settings through service', { guildId, channelId, settings });
      this.repo.updateChannelSettings(guildId, channelId, settings);
    } catch (error) {
      logger.error('Error updating channel settings', error instanceof Error ? error : new Error('Unknown error'), {
        guildId,
        channelId,
        settings,
      });
      throw error;
    }
  }

  public removeChannel(guildId: string, channelId: string): void {
    try {
      logger.debug('Removing channel through service', { guildId, channelId });
      this.repo.removeChannel(guildId, channelId);
    } catch (error) {
      logger.error('Error removing channel', error instanceof Error ? error : new Error('Unknown error'), {
        guildId,
        channelId,
      });
      throw error;
    }
  }

  public async fetchChannelWithPermissions(
    channelId: string,
    botMember: GuildMember,
    requiredPermissions: bigint,
  ): Promise<TextChannel | null> {
    try {
      logger.debug('Fetching channel with permission check', {
        channelId,
        guildId: botMember.guild.id,
        requiredPermissions: requiredPermissions.toString(),
      });

      const channel = await botMember.guild.channels.fetch(channelId);
      if (channel?.isTextBased() && botMember.permissionsIn(channel).has(requiredPermissions)) {
        logger.debug('Channel fetched successfully with required permissions', { channelId });
        return channel as TextChannel;
      }

      logger.warn('Channel fetched but missing permissions', {
        channelId,
        hasChannel: !!channel,
        isTextBased: channel?.isTextBased(),
      });

      return null;
    } catch (error) {
      logger.error(
        'Error fetching channel with permissions',
        error instanceof Error ? error : new Error('Unknown error'),
        {
          channelId,
          guildId: botMember.guild.id,
        },
      );
      throw new ChannelError(`Failed to fetch channel ${channelId}`);
    }
  }

  public shouldProcessMessage(message: Message, ignoreMonitoring = false): boolean {
    try {
      if (message.author.id === message.client.user?.id) return false;

      if (!message.guildId || !message.channelId) return false;

      if (!ignoreMonitoring) {
        const monitoredChannels = this.getMonitoredChannels(message.guildId);
        if (!monitoredChannels.includes(message.channelId)) return false;
      }

      return message.attachments.size > 0;
    } catch (error) {
      logger.error(
        'Error checking if message should be processed',
        error instanceof Error ? error : new Error('Unknown error'),
        {
          messageId: message.id,
          channelId: message.channelId,
        },
      );
      return false;
    }
  }

  public async processExistingMessages(
    channel: TextBasedChannel,
    limit = 10_000,
    ignoreMonitoring = false,
  ): Promise<void> {
    try {
      logger.info('Processing existing messages', {
        channelId: channel.id,
        limit,
        ignoreMonitoring,
      });

      let messages: Message[] = [];
      let lastId: string | undefined;

      while (messages.length < limit) {
        try {
          const fetched = await channel.messages.fetch({ limit: 100, before: lastId });
          if (fetched.size === 0) break;

          messages = messages.concat(Array.from(fetched.values()));
          lastId = fetched.last()?.id;

          if (messages.length >= limit) break;
        } catch (error) {
          logger.error('Error fetching message batch', error instanceof Error ? error : new Error('Unknown error'), {
            channelId: channel.id,
            lastId,
          });
          throw new ApiError('Failed to fetch messages from Discord');
        }
      }

      messages = messages.slice(0, limit).reverse();
      logger.info(`Fetched ${messages.length} messages from channel`, { channelId: channel.id });

      let processedCount = 0;
      for (const message of messages) {
        if (this.shouldProcessMessage(message, ignoreMonitoring)) {
          await MessageProcessor.pinIfNotPinned(message);
          processedCount++;
        }
      }

      logger.info(`Processed ${processedCount} messages in channel`, { channelId: channel.id });
    } catch (error) {
      logger.error(
        'Error processing messages in channel',
        error instanceof Error ? error : new Error('Unknown error'),
        {
          channelId: channel.id,
          limit,
        },
      );
      throw new ApiError(`Error processing messages in channel ${channel.id}`);
    }
  }

  public async unpinExistingMessages(channel: TextChannel, limit = 10_000): Promise<void> {
    try {
      logger.info('Unpinning existing messages', { channelId: channel.id, limit });

      const pinnedMessages = await channel.messages.fetchPinned();
      logger.debug(`Found ${pinnedMessages.size} pinned messages`, { channelId: channel.id });

      const pinnedArray = Array.from(pinnedMessages.values()).slice(0, limit);
      for (const pinnedMessage of pinnedArray) {
        try {
          await pinnedMessage.unpin();
          logger.debug('Unpinned message', {
            channelId: channel.id,
            messageId: pinnedMessage.id,
          });
        } catch (unpinError) {
          logger.error(
            'Failed to unpin message',
            unpinError instanceof Error ? unpinError : new Error('Unknown error'),
            {
              channelId: channel.id,
              messageId: pinnedMessage.id,
            },
          );
        }
      }

      logger.info(`Unpinned ${pinnedArray.length} messages`, { channelId: channel.id });
    } catch (error) {
      logger.error('Error unpinning messages in channel', error instanceof Error ? error : new Error('Unknown error'), {
        channelId: channel.id,
      });
      throw new ApiError(`Error unpinning messages in channel ${channel.id}`);
    }
  }

  public async deleteBotMessages(channel: TextChannel, limit = 10_000): Promise<void> {
    try {
      logger.info('Deleting bot messages', { channelId: channel.id, limit });

      let messages: Message[] = [];
      let lastId: string | undefined;

      while (messages.length < limit) {
        try {
          const fetched = await channel.messages.fetch({ limit: 100, before: lastId });
          if (fetched.size === 0) break;

          messages = messages.concat(Array.from(fetched.values()));
          lastId = fetched.last()?.id;

          if (messages.length >= limit) break;
        } catch (fetchError) {
          logger.error(
            'Error fetching messages for deletion',
            fetchError instanceof Error ? fetchError : new Error('Unknown error'),
            {
              channelId: channel.id,
              lastId,
            },
          );
          throw new ApiError('Failed to fetch messages from Discord');
        }
      }

      messages = messages.slice(0, limit);
      const botMessages = messages.filter((msg) => msg.author.id === channel.client.user?.id);
      logger.debug(`Found ${botMessages.length} bot messages to delete`, { channelId: channel.id });

      let deletedCount = 0;
      for (const msg of botMessages) {
        try {
          await msg.delete();
          deletedCount++;
        } catch (deleteError) {
          logger.error(
            'Failed to delete bot message',
            deleteError instanceof Error ? deleteError : new Error('Unknown error'),
            {
              channelId: channel.id,
              messageId: msg.id,
            },
          );
        }
      }

      logger.info(`Deleted ${deletedCount} bot messages in channel`, { channelId: channel.id });
    } catch (error) {
      logger.error(
        'Error deleting bot messages in channel',
        error instanceof Error ? error : new Error('Unknown error'),
        {
          channelId: channel.id,
        },
      );
      throw new ApiError(`Error deleting bot messages in channel ${channel.id}`);
    }
  }

  public async managePinLimit(channel: TextChannel, maxPins: number): Promise<void> {
    try {
      logger.debug('Managing pin limit', { channelId: channel.id, maxPins });

      const pinnedMessages = await channel.messages.fetchPinned();
      if (pinnedMessages.size >= maxPins) {
        logger.debug('Pin limit reached, unpinning oldest message', {
          channelId: channel.id,
          currentPinCount: pinnedMessages.size,
          maxPins,
        });

        const oldestPin = pinnedMessages.reduce((oldest, current) =>
          BigInt(current.id) < BigInt(oldest.id) ? current : oldest,
        );

        await oldestPin.unpin();
        logger.info('Unpinned oldest message to maintain pin limit', {
          channelId: channel.id,
          messageId: oldestPin.id,
        });
      }
    } catch (error) {
      logger.error('Error managing pin limit in channel', error instanceof Error ? error : new Error('Unknown error'), {
        channelId: channel.id,
        maxPins,
      });
    }
  }
}
