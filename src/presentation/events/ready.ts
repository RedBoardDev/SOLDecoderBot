import { Events, type Client } from 'discord.js';
import { logger } from '@shared/logger.js';

export const name = Events.ClientReady;
export const once = true;

export async function execute(client: Client) {
  logger.info(`✅ Discord bot ready! Logged in as ${client.user?.tag}`);
}
