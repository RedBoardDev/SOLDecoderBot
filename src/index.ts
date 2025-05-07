// src/index.ts
import 'reflect-metadata';
import { Client, GatewayIntentBits } from 'discord.js';
import { config } from './infrastructure/config/env';
import { logger } from './shared/logger';
import { setupErrorHandler } from './shared/error-handler';

// (Optionally) import your DI container loaders once implemented
// import { container } from './injection/container';
// import { CommandLoader } from './presentation/utils/command-loader';
// import { ListenerLoader } from './presentation/utils/listener-loader';

async function startBot(): Promise<void> {
  logger.info('Initializing Metlex Watcher Bot');

  // Global error handlers
  setupErrorHandler();

  const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
  });

  client.once('ready', () => {
    logger.info(`Logged in as ${client.user?.tag}`);
  });

  client.on('error', (error) => {
    logger.error('Discord client error', error);
  });

  // TODO: load slash commands
  // const cmdLoader = container.resolve(CommandLoader);
  // await cmdLoader.load(client);

  // TODO: load event listeners
  // const listenerLoader = container.resolve(ListenerLoader);
  // listenerLoader.load(client);

  try {
    await client.login(config.discordToken);
  } catch (err) {
    logger.fatal('Failed to login to Discord', err as Error);
    process.exit(1);
  }

  // Graceful shutdown
  const shutdown = async (): Promise<void> => {
    logger.info('Graceful shutdown initiated');
    try {
      await client.destroy();
      logger.info('Discord client destroyed');
    } catch (err) {
      logger.error('Error during Discord client destroy', err as Error);
    } finally {
      process.exit(0);
    }
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

startBot().catch((err) => {
  logger.fatal('Bot startup failed', err as Error);
  process.exit(1);
});
