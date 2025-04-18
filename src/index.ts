import { monitor } from '@commands/monitor';
import { monitored } from '@commands/monitored';
import { scan } from '@commands/scan';
import { clear } from '@commands/clear';
import { unmonitor } from '@commands/unmonitor';
import { help } from '@commands/help';
import { messageCreate } from '@events/message-create';
import type { Command } from '@type/command';
import { Client, Collection, GatewayIntentBits, type GuildMember, PermissionsBitField } from 'discord.js';
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
const commands: Command[] = [monitor, unmonitor, scan, clear, monitored, help];
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

  if (!isAdmin(interaction.member as GuildMember)) {
    await interaction.reply({
      content: 'You do not have permission to use this command. Only administrators can execute commands.',
      ephemeral: true,
    });
    return;
  }

  try {
    await command.execute(interaction);
  } catch (error) {
    console.error(`Error executing command ${interaction.commandName}:`, error);
    await interaction.reply({
      content: 'An error occurred while executing the command.',
      ephemeral: true,
    });
  }
});

client.on('messageCreate', messageCreate);

client.login(process.env.DISCORD_TOKEN).catch((error) => {
  console.error('Error logging in bot:', error);
  process.exit(1);
});

function isAdmin(member: GuildMember): boolean {
  if (!member) return false;
  return member.permissions.has(PermissionsBitField.Flags.Administrator);
}
