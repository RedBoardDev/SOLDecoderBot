import { SlashCommandBuilder, EmbedBuilder, type ChatInputCommandInteraction } from 'discord.js';
import type { Command } from '@type/command';

export const help: Command = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Show all available commands with their descriptions'),
  async execute(interaction: ChatInputCommandInteraction) {
    const client = interaction.client as unknown as { commands: Map<string, Command> };
    const embed = new EmbedBuilder()
      .setTitle('Bot Command Help')
      .setDescription('Voici la liste des commandes disponibles :');

    const fields = Array.from(client.commands.values()).map(cmd => {
      const name = cmd.data.toJSON().name;
      const description = cmd.data.toJSON().description;
      return { name: `/${name}`, value: description, inline: false };
    });

    embed.addFields(fields);

    await interaction.reply({ embeds: [embed], ephemeral: true });
  },
};
