import fs from 'node:fs';
import path from 'node:path';

export class ChannelRepository {
  private static instance: ChannelRepository;
  private readonly channels: Record<string, string[]>;
  private readonly filePath: string = path.join(__dirname, '../../channels.json');

  private constructor() {
    try {
      if (fs.existsSync(this.filePath)) {
        const data = fs.readFileSync(this.filePath, 'utf8');
        this.channels = JSON.parse(data) as Record<string, string[]>;
      } else {
        this.channels = {};
        this.save();
      }
    } catch (error) {
      console.error('Error initializing channel repository:', error);
      this.channels = {};
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
    try {
      fs.writeFileSync(this.filePath, JSON.stringify(this.channels, null, 2), 'utf8');
    } catch (error) {
      console.error('Error saving channel data:', error);
    }
  }
}
