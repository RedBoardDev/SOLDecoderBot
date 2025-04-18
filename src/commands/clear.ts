import { ChannelService } from '@services/channel-service';
import type { Command } from '@type/command';
import { SlashCommandBuilder, PermissionsBitField, type CommandInteraction } from 'discord.js';

const service = new ChannelService();
const MAX_MESSAGES = 10_000;

export const clear: Command = {
  data: new SlashCommandBuilder()
    .setName('clear')
    .setDescription('Unpins up to 10,000 messages in the current channel'),
  async execute(interaction: CommandInteraction): Promise<void> {
    if (!interaction.guildId || !interaction.guild || !interaction.channelId) {
      await interaction.reply({ content: 'This command must be used in a server channel.', ephemeral: true });
      return;
    }

    const botMember = interaction.guild.members.me;
    if (!botMember) {
      await interaction.reply({ content: 'Unable to retrieve bot information.', ephemeral: true });
      return;
    }

    const channel = await service.fetchChannelWithPermissions(
      interaction.channelId,
      botMember,
      PermissionsBitField.Flags.ManageMessages,
    );

    if (!channel) {
      await interaction.reply({
        content: 'The bot does not have permission to manage messages in this channel.',
        ephemeral: true,
      });
      return;
    }

    await interaction.deferReply({ ephemeral: true });
    try {
      await service.unpinExistingMessages(channel, MAX_MESSAGES);
      await interaction.editReply('Unpinning completed successfully in this channel.');
    } catch (error) {
      console.error('Error unpinning messages:', error);
      await interaction.editReply('An error occurred during unpinning.');
    }
  },
};
