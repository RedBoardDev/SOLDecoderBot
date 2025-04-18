import { add } from '@commands/add';
import { list } from '@commands/list';
import { load } from '@commands/load';
import { remove } from '@commands/remove';
import { REST, Routes } from 'discord.js';
import { config } from 'dotenv';

config();

const commands = [add, remove, load, list].map((command) => command.data.toJSON());
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
