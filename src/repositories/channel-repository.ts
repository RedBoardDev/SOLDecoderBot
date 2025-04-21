// src/repositories/channel-repository.ts
import fs from 'node:fs';
import path from 'node:path';

export interface ChannelSettings {
  image: boolean;
  tag?: { type: 'user' | 'role'; id: string };
}
type GuildConfig = Record<string, ChannelSettings>;
type ConfigFile  = Record<string, GuildConfig>;

export class ChannelRepository {
  private static instance: ChannelRepository;
  private readonly filePath = path.join(__dirname, '../../channels.json');
  private channels: ConfigFile;

  private constructor() {
    let raw: unknown;
    try {
      raw = fs.existsSync(this.filePath)
        ? JSON.parse(fs.readFileSync(this.filePath, 'utf8'))
        : {};
    } catch {
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
    const out: ConfigFile = {};
    for (const [guildId, cfg] of Object.entries(raw)) {
      if (Array.isArray(cfg)) {
        out[guildId] = {};
        for (const chanId of cfg) {
          out[guildId][chanId] = { image: false };
        }
      } else if (typeof cfg === 'object' && cfg !== null) {
        out[guildId] = cfg as GuildConfig;
      }
    }
    return out;
  }

  private save(): void {
    fs.writeFileSync(this.filePath, JSON.stringify(this.channels, null, 2), 'utf8');
  }

  public getMonitoredChannels(guildId: string): string[] {
    return Object.keys(this.channels[guildId] ?? {});
  }

  public getChannelSettings(
    guildId: string,
    channelId: string
  ): ChannelSettings {
    const guild = this.channels[guildId] ?? {};
    return guild[channelId] ?? { image: false };
  }

  public addChannel(
    guildId: string,
    channelId: string,
    settings: Partial<ChannelSettings> = {}
  ): void {
    if (!this.channels[guildId]) this.channels[guildId] = {};
    this.channels[guildId][channelId] = {
      image: false,
      ...settings,
    };
    this.save();
  }

  public updateChannelSettings(
    guildId: string,
    channelId: string,
    settings: Partial<ChannelSettings>
  ): void {
    if (!this.channels[guildId]?.[channelId]) {
      this.addChannel(guildId, channelId, settings);
    } else {
      Object.assign(this.channels[guildId][channelId], settings);
      this.save();
    }
  }

  public removeChannel(guildId: string, channelId: string): void {
    const guild = this.channels[guildId];
    if (!guild || !guild[channelId]) return;

    delete guild[channelId];
    if (Object.keys(guild).length === 0) {
      delete this.channels[guildId];
    }
    this.save();
  }
}
