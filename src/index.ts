import { monitor } from '@commands/monitor';
import { monitored } from '@commands/monitored';
import { scan } from '@commands/scan';
import { clear } from '@commands/clear';
import { unmonitor } from '@commands/unmonitor';
import { messageCreate } from '@events/message-create';
import type { Command } from '@type/command';
import { Client, Collection, GatewayIntentBits } from 'discord.js';
import { config } from 'dotenv';

config();

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
});

declare module 'discord.js' {
  interface Client {
    commands: Collection<string, Command>;
  }
}

client.commands = new Collection<string, Command>();
const commands = [monitor, unmonitor, scan, clear, monitored];
for (const command of commands) {
  client.commands.set(command.data.name, command);
}

client.once('ready', () => {
  console.log(`Logged in as ${client.user?.tag}`);
});

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isCommand()) return;
  const command = client.commands.get(interaction.commandName);
  if (!command) return;
  try {
    await command.execute(interaction);
  } catch (error) {
    console.error(error);
    await interaction.reply({
      content: 'Erreur lors de l’exécution de la commande.',
      ephemeral: true,
    });
  }
});

client.on('messageCreate', messageCreate);

client.login(process.env.DISCORD_TOKEN).catch((error) => {
  console.error('Erreur lors de la connexion du bot:', error);
  process.exit(1);
});
