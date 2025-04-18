import fs from 'node:fs';
import path from 'node:path';

export class ChannelRepository {
  private static instance: ChannelRepository;
  private readonly channels: Record<string, string[]>;
  private readonly channelsFile: string = path.join(__dirname, '../../channels.json');

  private constructor() {
    if (fs.existsSync(this.channelsFile)) {
      const data = fs.readFileSync(this.channelsFile, 'utf8');
      this.channels = JSON.parse(data) as Record<string, string[]>;
    } else {
      this.channels = {};
      this.save();
    }
  }

  public static getInstance(): ChannelRepository {
    if (!ChannelRepository.instance) {
      ChannelRepository.instance = new ChannelRepository();
    }
    return ChannelRepository.instance;
  }

  public getMonitoredChannels(guildId: string): string[] {
    return this.channels[guildId] ?? [];
  }

  public addChannel(guildId: string, channelId: string): void {
    if (!this.channels[guildId]) {
      this.channels[guildId] = [];
    }
    if (!this.channels[guildId].includes(channelId)) {
      this.channels[guildId].push(channelId);
      this.save();
    }
  }

  public removeChannel(guildId: string, channelId: string): void {
    if (this.channels[guildId]) {
      this.channels[guildId] = this.channels[guildId].filter((id) => id !== channelId);
      if (this.channels[guildId].length === 0) {
        delete this.channels[guildId];
      }
      this.save();
    }
  }

  private save(): void {
    fs.writeFileSync(this.channelsFile, JSON.stringify(this.channels, null, 2), 'utf8');
  }
}
