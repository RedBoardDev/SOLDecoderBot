import { Client, GatewayIntentBits, MessageFlags } from 'discord.js';
import { REST } from '@discordjs/rest';
import { Routes } from 'discord-api-types/v10';
import { config } from './infrastructure/config/env';
import { logger } from './shared/logger';
import { setupErrorHandler } from './shared/error-handler';
import { registerWatchersInteractionHandlers } from './presentation/listeners/watchers-interaction';
import { watchersCommand } from './presentation/commands/watchers.command';
import { registerWalletDetailInteractionHandlers } from './presentation/listeners/watchers-interaction/wallet-settings';
import { registerClosedMessageListener } from './presentation/listeners/closed-message.listener';

async function startBot(): Promise<void> {
  logger.info('Initializing Metlex Watcher Bot');
  setupErrorHandler();

  const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
  });

  const rest = new REST({ version: '10' }).setToken(config.discordToken);
  const commandsPayload = [watchersCommand.data.toJSON()];

  client.once('ready', async () => {
    logger.info(`Logged in as ${client.user?.tag}`);

    try {
      await rest.put(Routes.applicationCommands(client.user!.id), { body: commandsPayload });
      logger.info('✅ Registered slash commands');
    } catch (err: unknown) {
      logger.error('Failed to register slash commands', err instanceof Error ? err : new Error(String(err)));
    }
  });

  client.on('interactionCreate', async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    const { commandName } = interaction;

    const commands: Record<string, typeof watchersCommand> = {
      [watchersCommand.data.name]: watchersCommand,
    };

    const command = commands[commandName];
    if (command) {
      await command.execute(interaction);
    } else {
      await interaction.reply({ content: 'Unknown command', flags: MessageFlags.Ephemeral });
    }
  });

  // register events
  registerWatchersInteractionHandlers(client);
  registerWalletDetailInteractionHandlers(client);
  registerClosedMessageListener(client);

  client.on('error', (error) => {
    logger.error('Discord client error', error);
  });

  try {
    await client.login(config.discordToken);
  } catch (err: unknown) {
    logger.fatal('Failed to login to Discord', err instanceof Error ? err : new Error(String(err)));
    process.exit(1);
  }

  const shutdown = async (): Promise<void> => {
    logger.info('Graceful shutdown initiated');
    try {
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

startBot().catch((err: unknown) => {
  logger.fatal('Bot startup failed', err instanceof Error ? err : new Error(String(err)));
  process.exit(1);
});
