import { monitor } from '@commands/monitor';
import { monitored } from '@commands/monitored';
import { scan } from '@commands/scan';
import { clear } from '@commands/clear';
import { unmonitor } from '@commands/unmonitor';
import { REST, Routes } from 'discord.js';
import { config } from 'dotenv';

config();

const commands = [monitor, unmonitor, scan, clear, monitored].map((command) => command.data.toJSON());
const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN ?? '');

(async (): Promise<void> => {
  try {
    console.log('Déploiement des commandes...');
    await rest.put(Routes.applicationCommands(process.env.CLIENT_ID ?? ''), {
      body: commands,
    });
    console.log('Commandes déployées avec succès.');
  } catch (error) {
    console.error('Erreur lors du déploiement des commandes:', error);
  }
})();
