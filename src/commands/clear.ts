import { ChannelService } from '@services/channel-service';
import type { Command } from '@type/command';
import { SlashCommandBuilder, PermissionsBitField, type CommandInteraction } from 'discord.js';

const service = new ChannelService();
const MAX_MESSAGES = 10_000;

export const clear: Command = {
  data: new SlashCommandBuilder()
    .setName('clear')
    .setDescription('Unpin up to 10,000 messages and delete bot posts in this channel'),
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
      await service.deleteBotMessages(channel, MAX_MESSAGES);
      await interaction.editReply('Unpinning and bot message deletion completed successfully in this channel.');
    } catch (error) {
      console.error('Error during clear operation:', error);
      await interaction.editReply('An error occurred during the clear operation.');
    }
  },
};
