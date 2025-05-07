import type { ChannelSettings, ConfigFile, GuildConfig } from '@type/channel-settings';
import fs from 'node:fs';
import path from 'node:path';
import { logger, DatabaseError } from '../utils';

export class ChannelRepository {
  private static instance: ChannelRepository;
  private readonly filePath = path.join(__dirname, '../../channels.json');
  private channels: ConfigFile;

  private constructor() {
    let raw: unknown;
    try {
      logger.debug('Initializing channel repository');
      raw = fs.existsSync(this.filePath) ? JSON.parse(fs.readFileSync(this.filePath, 'utf8')) : {};
      logger.debug('Channel config loaded', { path: this.filePath });
    } catch (error) {
      logger.error(
        'Failed to load channel configuration',
        error instanceof Error ? error : new Error('Unknown error'),
        {
          path: this.filePath,
        },
      );
      raw = {};
    }
    this.channels = this.migrate(raw);
    this.save();
  }

  public static getInstance(): ChannelRepository {
    if (!ChannelRepository.instance) {
      ChannelRepository.instance = new ChannelRepository();
    }
    return ChannelRepository.instance;
  }

  private migrate(raw: any): ConfigFile {
    try {
      logger.debug('Migrating channel configuration');
      const out: ConfigFile = {};
      for (const [guildId, cfg] of Object.entries(raw)) {
        out[guildId] = {};
        if (Array.isArray(cfg)) {
          // old format
          for (const chanId of cfg) {
            out[guildId][chanId] = { image: false, tag: false };
          }
        } else if (typeof cfg === 'object' && cfg !== null) {
          for (const [chanId, settings] of Object.entries(cfg as GuildConfig)) {
            out[guildId][chanId] = {
              image: settings.image ?? false,
              tag: settings.tag ?? false,
            };
          }
        }
      }
      logger.debug('Migration completed', { guildCount: Object.keys(out).length });
      return out;
    } catch (error) {
      logger.error('Migration failed', error instanceof Error ? error : new Error('Unknown error'));
      return {};
    }
  }

  private save(): void {
    try {
      fs.writeFileSync(this.filePath, JSON.stringify(this.channels, null, 2), 'utf8');
      logger.debug('Channel configuration saved', { path: this.filePath });
    } catch (error) {
      logger.error(
        'Failed to save channel configuration',
        error instanceof Error ? error : new Error('Unknown error'),
        {
          path: this.filePath,
        },
      );
      throw new DatabaseError('Failed to save channel configuration');
    }
  }

  public getMonitoredChannels(guildId: string): string[] {
    try {
      return Object.keys(this.channels[guildId] ?? {});
    } catch (error) {
      logger.error('Failed to get monitored channels', error instanceof Error ? error : new Error('Unknown error'), {
        guildId,
      });
      return [];
    }
  }

  public getChannelSettings(guildId: string, channelId: string): ChannelSettings {
    try {
      const guild = this.channels[guildId] ?? {};
      return guild[channelId] ?? { image: false, tag: false };
    } catch (error) {
      logger.error('Failed to get channel settings', error instanceof Error ? error : new Error('Unknown error'), {
        guildId,
        channelId,
      });
      return { image: false, tag: false };
    }
  }

  public addChannel(guildId: string, channelId: string, settings: Partial<ChannelSettings> = {}): void {
    try {
      logger.debug('Adding channel to monitoring', { guildId, channelId, settings });
      if (!this.channels[guildId]) this.channels[guildId] = {};
      this.channels[guildId][channelId] = {
        image: settings.image ?? false,
        tag: settings.tag ?? false,
      };
      this.save();
    } catch (error) {
      logger.error('Failed to add channel', error instanceof Error ? error : new Error('Unknown error'), {
        guildId,
        channelId,
        settings,
      });
      throw new DatabaseError(`Failed to add channel ${channelId}`);
    }
  }

  public updateChannelSettings(guildId: string, channelId: string, settings: Partial<ChannelSettings>): void {
    try {
      logger.debug('Updating channel settings', { guildId, channelId, settings });
      if (!this.channels[guildId]?.[channelId]) {
        this.addChannel(guildId, channelId, settings);
      } else {
        const curr = this.channels[guildId][channelId];
        curr.image = settings.image ?? curr.image;
        curr.tag = settings.tag ?? curr.tag;
        this.save();
      }
    } catch (error) {
      logger.error('Failed to update channel settings', error instanceof Error ? error : new Error('Unknown error'), {
        guildId,
        channelId,
        settings,
      });
      throw new DatabaseError(`Failed to update settings for channel ${channelId}`);
    }
  }

  public removeChannel(guildId: string, channelId: string): void {
    try {
      logger.debug('Removing channel from monitoring', { guildId, channelId });
      const guild = this.channels[guildId];
      if (!guild || !guild[channelId]) return;

      delete guild[channelId];
      if (Object.keys(guild).length === 0) {
        delete this.channels[guildId];
      }
      this.save();
    } catch (error) {
      logger.error('Failed to remove channel', error instanceof Error ? error : new Error('Unknown error'), {
        guildId,
        channelId,
      });
      throw new DatabaseError(`Failed to remove channel ${channelId}`);
    }
  }
}
