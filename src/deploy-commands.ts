import { monitor } from '@commands/monitor';
import { monitored } from '@commands/monitored';
import { scan } from '@commands/scan';
import { clear } from '@commands/clear';
import { unmonitor } from '@commands/unmonitor';
import { help } from '@commands/help';
import { REST, Routes } from 'discord.js';
import { config } from 'dotenv';
import { settings } from '@commands/settings';

config();

const commands = [monitor, unmonitor, scan, clear, monitored, help, settings].map((command) => command.data.toJSON());
const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN ?? '');

(async (): Promise<void> => {
  try {
    console.log('Deploying commands...');
    await rest.put(Routes.applicationCommands(process.env.CLIENT_ID ?? ''), { body: commands });
    console.log('Commands deployed successfully.');
  } catch (error) {
    console.error('Error deploying commands:', error);
    process.exit(1);
  }
})();
