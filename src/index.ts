import { monitor } from '@commands/monitor';
import { monitored } from '@commands/monitored';
import { scan } from '@commands/scan';
import { clear } from '@commands/clear';
import { unmonitor } from '@commands/unmonitor';
import { help } from '@commands/help';
import { settings } from '@commands/settings';
import { messageCreate } from '@events/message-create';
import type { Command } from '@type/command';
import {
  Client,
  Collection,
  GatewayIntentBits,
  type GuildMember,
  PermissionsBitField,
  type ChatInputCommandInteraction,
} from 'discord.js';
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
const commands: Command[] = [monitor, unmonitor, scan, clear, monitored, help, settings];
for (const command of commands) {
  client.commands.set(command.data.name, command);
}

client.once('ready', () => {
  console.log(`Logged in as ${client.user?.tag}`);
});

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const command = client.commands.get(interaction.commandName);
  if (!command) return;

  const member = interaction.member as GuildMember;
  if (!member.permissions.has(PermissionsBitField.Flags.Administrator)) {
    await interaction.reply({
      content: 'You do not have permission to use this command. Only administrators can execute commands.',
      ephemeral: true,
    });
    return;
  }

  try {
    await command.execute(interaction as ChatInputCommandInteraction);
  } catch (error) {
    console.error(`Error executing command ${interaction.commandName}:`, error);
    if (!interaction.replied) {
      await interaction.reply({
        content: 'An error occurred while executing the command.',
        ephemeral: true,
      });
    }
  }
});

client.on('messageCreate', messageCreate);

client.login(process.env.DISCORD_TOKEN).catch((error) => {
  console.error('Error logging in bot:', error);
  process.exit(1);
});
