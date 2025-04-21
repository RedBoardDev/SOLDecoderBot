import { monitor } from '@commands/monitor';
import { monitored } from '@commands/monitored';
import { scan } from '@commands/scan';
import { clear } from '@commands/clear';
import { unmonitor } from '@commands/unmonitor';
import { help } from '@commands/help';
import { settings } from '@commands/settings';
import { messageCreate } from '@events/message-create';
import type { Command } from '@type/command';
import { Client, Collection, GatewayIntentBits, type ChatInputCommandInteraction } from 'discord.js';
import { config } from 'dotenv';
import { logger, LogLevel } from './utils/logger';
import { handleCommandError } from './utils/error-handler';
import { requireAdmin } from './utils/command-guards';

config();

const isProduction = process.env.NODE_ENV === 'production';
logger.setLevel(isProduction ? LogLevel.INFO : LogLevel.DEBUG);

logger.info('Bot starting up', {
  environment: isProduction ? 'production' : 'development',
  nodeVersion: process.version,
  platform: process.platform,
});

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
});

declare module 'discord.js' {
  interface Client {
    commands: Collection<string, Command>;
  }
}

client.commands = new Collection<string, Command>();
const commands: Command[] = [monitor, unmonitor, scan, clear, monitored, help, settings];
for (const command of commands) {
  client.commands.set(command.data.name, command);
}

client.once('ready', () => {
  logger.info(`Bot is ready! Logged in as ${client.user?.tag}`);
});

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const command = client.commands.get(interaction.commandName);
  if (!command) return;

  try {
    requireAdmin(interaction);

    logger.debug('Executing command', {
      command: interaction.commandName,
      user: interaction.user.tag,
      channelId: interaction.channelId,
    });

    await command.execute(interaction as ChatInputCommandInteraction);
  } catch (error) {
    await handleCommandError(error, interaction as ChatInputCommandInteraction);
  }
});

client.on('messageCreate', messageCreate);

process.on('unhandledRejection', (error) => {
  logger.error('Unhandled promise rejection', error as Error);
});

process.on('uncaughtException', (error) => {
  logger.fatal('Uncaught exception', error);
  if (isProduction) {
    client.destroy();
    process.exit(1);
  }
});

client.login(process.env.DISCORD_TOKEN).catch((error) => {
  logger.fatal('Failed to login to Discord', error as Error);
  process.exit(1);
});
