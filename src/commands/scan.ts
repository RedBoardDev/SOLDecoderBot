import { ChannelService } from '@services/channel-service';
import type { Command } from '@type/command';
import { SlashCommandBuilder, PermissionsBitField, type CommandInteraction } from 'discord.js';

const service = new ChannelService();
const MAX_MESSAGES = 10_000;

export const scan: Command = {
  data: new SlashCommandBuilder().setName('scan').setDescription('Loads and processes up to 10,000 existing messages'),
  async execute(interaction: CommandInteraction): Promise<void> {
    if (!interaction.guildId || !interaction.guild) {
      await interaction.reply({ content: 'This command must be used in a server.', ephemeral: true });
      return;
    }

    const botMember = interaction.guild.members.me;
    if (!botMember) {
      await interaction.reply({ content: 'Unable to retrieve bot information.', ephemeral: true });
      return;
    }

    const channels = await service.fetchMonitoredChannelsWithPermissions(
      interaction.guildId,
      botMember,
      PermissionsBitField.Flags.ViewChannel,
    );

    if (channels.length === 0) {
      await interaction.reply({ content: 'No monitored channels with required permissions.', ephemeral: true });
      return;
    }

    await interaction.deferReply({ ephemeral: true });
    try {
      for (const channel of channels) {
        await service.processExistingMessages(channel, MAX_MESSAGES);
      }
      await interaction.editReply('Processing completed successfully.');
    } catch (error) {
      console.error('Error processing messages:', error);
      await interaction.editReply('An error occurred during processing.');
    }
  },
};
