import { ChannelService } from '@services/channel-service';
import type { Command } from '@type/command';
import { SlashCommandBuilder, PermissionsBitField, type CommandInteraction } from 'discord.js';

const service = new ChannelService();
const MAX_MESSAGES = 10_000;

export const scan: Command = {
  data: new SlashCommandBuilder()
    .setName('scan')
    .setDescription('Loads and processes up to 10,000 existing messages in the current channel'),
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
      PermissionsBitField.Flags.ViewChannel | PermissionsBitField.Flags.ManageMessages, // Scan needs both
    );

    if (!channel) {
      await interaction.reply({ content: 'The bot does not have permission to view or manage messages in this channel.', ephemeral: true });
      return;
    }

    await interaction.deferReply({ ephemeral: true });
    try {
      await service.processExistingMessages(channel, MAX_MESSAGES, true);
      await interaction.editReply('Processing completed successfully in this channel.');
    } catch (error) {
      console.error('Error processing messages:', error);
      await interaction.editReply('An error occurred during processing. Check the pin limit or permissions.');
    }
  },
};