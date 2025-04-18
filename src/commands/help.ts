import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import type { Command } from '@type/command';

export const help: Command = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Displays the list of available commands and their descriptions'),
  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setTitle('Bot Command Help')
      .setDescription('Here are the commands you can use with this bot:')
      .addFields(
        { name: '/monitor', value: 'Adds the current channel to the list of monitored channels.' },
        { name: '/unmonitor', value: 'Removes the current channel from the list of monitored channels.' },
        { name: '/scan', value: 'Loads and processes up to 10,000 existing messages in monitored channels.' },
        { name: '/clear', value: 'Unpins up to 10,000 messages in monitored channels.' },
        { name: '/monitored', value: 'Lists all monitored channels in the server.' },
      )
      .setFooter({
        text: 'All commands are slash commands. Use / followed by the command name to execute them.',
      });

    await interaction.reply({ embeds: [embed], ephemeral: true });
  },
};
