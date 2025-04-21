import { monitor } from '@commands/monitor';
import { monitored } from '@commands/monitored';
import { scan } from '@commands/scan';
import { clear } from '@commands/clear';
import { unmonitor } from '@commands/unmonitor';
import { help } from '@commands/help';
import { settings } from '@commands/settings';
import { example } from '@commands/example';
import { REST, Routes } from 'discord.js';
import { config } from 'dotenv';
import { logger } from './utils/logger';

config();

const commands = [monitor, unmonitor, scan, clear, monitored, help, settings, example].map((command) =>
  command.data.toJSON(),
);

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN ?? '');

(async (): Promise<void> => {
  try {
    logger.info('Deploying application commands...');

    await rest.put(Routes.applicationCommands(process.env.CLIENT_ID ?? ''), { body: commands });

    logger.info(`Successfully deployed ${commands.length} application commands`);
  } catch (error) {
    logger.error('Failed to deploy commands', error instanceof Error ? error : new Error('Unknown error'));
    process.exit(1);
  }
})();
