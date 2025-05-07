import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import type { Command } from '@type/command';
import { handleCommandError, logger } from '../utils';

export const help: Command = {
  data: new SlashCommandBuilder().setName('help').setDescription('Show all available commands with their descriptions'),
  async execute(interaction) {
    try {
      logger.debug('Executing help command', { userId: interaction.user.id });

      const client = interaction.client as unknown as { commands: Map<string, Command> };

      const embed = new EmbedBuilder()
        .setTitle('Bot Command Help')
        .setDescription('Here is the list of available commands:');

      const fields = Array.from(client.commands.values()).map((cmd) => {
        const name = cmd.data.toJSON().name;
        const description = cmd.data.toJSON().description;
        return { name: `/${name}`, value: description, inline: false };
      });

      embed.addFields(fields);

      logger.debug('Sending help information', {
        commandCount: fields.length,
        userId: interaction.user.id,
      });

      await interaction.reply({ embeds: [embed], ephemeral: true });
    } catch (error) {
      await handleCommandError(error, interaction);
    }
  },
};
