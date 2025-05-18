// src/index.ts
import { Client, GatewayIntentBits, MessageFlags } from 'discord.js';
import { REST } from '@discordjs/rest';
import { Routes } from 'discord-api-types/v10';

import { config } from './infrastructure/config/env';
import { logger } from './shared/logger';
import { setupErrorHandler } from './shared/error-handler';

import { watchersCommand } from './presentation/commands/watchers.command';
import { registerWatchersInteractionHandlers } from './presentation/listeners/watchers-interaction';
import { registerWalletDetailInteractionHandlers } from './presentation/listeners/watchers-interaction/wallet-settings';
import { registerClosedMessageListener } from './presentation/listeners/closed-message.listener';

import { SummaryScheduler } from './infrastructure/services/summary-scheduler';

const DISCORD_INTENTS = [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent];

async function registerSlashCommands(clientId: string, token: string) {
  const rest = new REST({ version: '10' }).setToken(token);
  const payload = [watchersCommand.data.toJSON()];

  try {
    await rest.put(Routes.applicationCommands(clientId), { body: payload });
    logger.info('✅ Registered slash commands');
  } catch (err: unknown) {
    logger.error('Failed to register slash commands', err instanceof Error ? err : new Error(String(err)));
    throw err;
  }
}

function wireInteractionHandler(client: Client) {
  client.on('interactionCreate', async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    switch (interaction.commandName) {
      case watchersCommand.data.name:
        await watchersCommand.execute(interaction);
        break;
      default:
        await interaction.reply({
          content: 'Unknown command',
          flags: MessageFlags.Ephemeral,
        });
    }
  });
}

function wireAdditionalListeners(client: Client) {
  registerClosedMessageListener(client);
  registerWatchersInteractionHandlers(client);
  registerWalletDetailInteractionHandlers(client);
}

function setupShutdownHooks(client: Client) {
  const shutdown = async () => {
    logger.info('Graceful shutdown initiated');
    try {
      SummaryScheduler.getInstance().stopAll();
      await client.destroy();
      logger.info('Discord client destroyed');
    } catch (err: unknown) {
      logger.error('Error during shutdown', err instanceof Error ? err : new Error(String(err)));
    } finally {
      process.exit(0);
    }
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

async function main() {
  logger.info('Initializing bot');
  setupErrorHandler();

  const client = new Client({ intents: DISCORD_INTENTS });

  client.once('ready', async () => {
    logger.info(`Logged in as ${client.user?.tag}`);

    // register application (slash) commands
    await registerSlashCommands(client.user!.id, config.discordToken);

    // start the periodic summary
    SummaryScheduler.getInstance().run('WEEK', 'Europe/Helsinki', client);
  });

  wireInteractionHandler(client);
  wireAdditionalListeners(client);

  client.on('error', (error) => {
    logger.error('Discord client error', error);
  });

  setupShutdownHooks(client);

  try {
    await client.login(config.discordToken);
  } catch (err: unknown) {
    logger.fatal('Failed to login to Discord', err instanceof Error ? err : new Error(String(err)));
    process.exit(1);
  }
}

main().catch((err: unknown) => {
  logger.fatal('Bot startup failed', err instanceof Error ? err : new Error(String(err)));
  process.exit(1);
});
