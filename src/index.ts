import { Client, GatewayIntentBits, Events } from 'discord.js';
import { config } from './infrastructure/config/env.js';
import { logger } from './shared/logger.js';
import { loadCommands } from './presentation/utils/command-loader.js';
import { loadEvents } from './presentation/utils/event-loader.js';
import { RpcServiceManager } from './infrastructure/services/rpc-service-manager.js';
import {
  createAutoRefreshScheduler,
  type AutoRefreshScheduler,
} from './infrastructure/services/auto-refresh-scheduler.js';
import { DiscordClientManager } from './infrastructure/services/discord-client-manager.js';

// Global error handlers to prevent crashes
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception occurred', error);
  logger.warn('Bot continues running, but this error should be investigated');
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection occurred', { reason, promise });
  logger.warn('Bot continues running, but this error should be investigated');
});

class SolDecoderBot {
  private client: Client;
  private commands: Map<string, any> | undefined;
  private rpcServiceManager: RpcServiceManager;
  private discordClientManager: DiscordClientManager;
  private autoRefreshScheduler: AutoRefreshScheduler | undefined;

  constructor() {
    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMembers, // Required for role management
      ],
    });
    this.rpcServiceManager = RpcServiceManager.getInstance();
    this.discordClientManager = DiscordClientManager.getInstance();
    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    this.client.once(Events.ClientReady, async (client) => {
      logger.info(`Discord bot ready - logged in as ${client.user?.tag}`);

      try {
        // Initialize Discord Client Manager
        this.discordClientManager.initialize(client);

        // Initialize RPC service
        this.rpcServiceManager.initialize(config.RPC_ENDPOINT);
        logger.serviceInit('RPC Service Manager');

        // Load commands and events
        this.commands = await loadCommands(client);
        await loadEvents(client);

        // Initialize auto-refresh scheduler (now async)
        this.autoRefreshScheduler = await createAutoRefreshScheduler();
        this.autoRefreshScheduler.start();
        logger.serviceInit('Auto-refresh scheduler (15-minute interval)');

        logger.info('Bot initialization completed successfully');
        logger.info('Use npm run deploy-commands to register slash commands');
      } catch (error) {
        logger.error('Bot initialization failed', error);
        logger.warn('Bot will continue with limited functionality');
      }
    });

    this.client.on(Events.InteractionCreate, async (interaction) => {
      if (!interaction.isChatInputCommand()) return;

      const command = this.commands?.get(interaction.commandName);
      if (!command) {
        logger.warn(`Unknown command attempted: ${interaction.commandName}`);
        return;
      }

      try {
        logger.commandExecution(interaction.commandName, interaction.user.id);
        await command.execute(interaction);
      } catch (error) {
        logger.commandError(interaction.commandName, interaction.user.id, error);

        const reply = {
          content: 'There was an error while executing this command. Please try again later.',
          ephemeral: true,
        };

        try {
          if (interaction.replied || interaction.deferred) {
            await interaction.followUp(reply);
          } else {
            await interaction.reply(reply);
          }
        } catch (replyError) {
          logger.error('Failed to send error reply to user', replyError);
        }
      }
    });

    // Discord client error handling
    this.client.on(Events.Error, (error) => {
      logger.error('Discord client error occurred', error);
    });
  }

  async shutdown(): Promise<void> {
    logger.info('Bot shutdown initiated');

    try {
      if (this.autoRefreshScheduler) {
        this.autoRefreshScheduler.stop();
      }
      await this.rpcServiceManager.shutdown();
      this.client.destroy();
      logger.info('Bot shutdown completed successfully');
    } catch (error) {
      logger.error('Error during bot shutdown', error);
    }
  }

  async start(): Promise<void> {
    try {
      await this.client.login(config.DISCORD_TOKEN);
      logger.info('Bot login successful');
    } catch (error) {
      logger.error('Bot login failed', error);
      logger.warn('Check Discord token and internet connection');

      // Wait before retry
      setTimeout(() => {
        logger.info('Attempting reconnection...');
        this.start().catch((retryError) => {
          logger.error('Reconnection failed', retryError);
          logger.error('Bot will exit - please check configuration');
          process.exit(1);
        });
      }, 5000);
    }
  }
}

// Graceful shutdown handling
process.on('SIGINT', async () => {
  logger.info('SIGINT received - initiating graceful shutdown');
  const bot = new SolDecoderBot();
  await bot.shutdown();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('SIGTERM received - initiating graceful shutdown');
  const bot = new SolDecoderBot();
  await bot.shutdown();
  process.exit(0);
});

// Start the bot
const bot = new SolDecoderBot();
bot.start().catch((error) => {
  logger.error('Failed to start bot', error);
  logger.error('Check configuration and restart bot');
  process.exit(1);
});
