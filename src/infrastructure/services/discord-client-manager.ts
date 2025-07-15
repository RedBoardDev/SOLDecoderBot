import type { Client, Guild } from 'discord.js';
import { logger } from '@shared/logger.js';
import { config } from '@config/env.js';

export class DiscordClientManager {
  private static instance: DiscordClientManager;
  private client: Client | null = null;
  private guild: Guild | null = null;

  private constructor() {}

  static getInstance(): DiscordClientManager {
    if (!DiscordClientManager.instance) {
      DiscordClientManager.instance = new DiscordClientManager();
    }
    return DiscordClientManager.instance;
  }

  initialize(client: Client): void {
    if (this.client) {
      logger.warn('Discord Client Manager already initialized');
      return;
    }

    this.client = client;
    logger.serviceInit('Discord Client Manager');

    // Cache the guild for performance
    this.cacheGuild();
  }

  private async cacheGuild(): Promise<void> {
    if (!this.client) {
      logger.error('Discord client not initialized when trying to cache guild');
      return;
    }

    try {
      this.guild = await this.client.guilds.fetch(config.GUILD_ID);
      logger.info(`Guild cached: ${this.guild.name} (${this.guild.memberCount} members)`);
    } catch (error) {
      logger.error('Failed to cache guild:', error);
    }
  }

  getClient(): Client {
    if (!this.client) {
      throw new Error('Discord Client not initialized. Call initialize() first.');
    }
    return this.client;
  }

  getGuild(): Guild {
    if (!this.guild) {
      throw new Error('Guild not cached. Make sure bot is properly initialized.');
    }
    return this.guild;
  }

  isInitialized(): boolean {
    return this.client !== null && this.guild !== null;
  }

  shutdown(): void {
    if (this.client) {
      this.client = null;
      this.guild = null;
      logger.info('Discord Client Manager shutdown completed');
    }
  }
}
