import { SlashCommandBuilder, PermissionsBitField } from 'discord.js';
import type { Command } from '@type/command';
import { ChannelService } from '@services/channel-service';
import { requireGuild, requireBotPermissions, handleCommandError, logger } from '../utils';

const service = new ChannelService();
const MAX_MESSAGES = 10_000;

export const scan: Command = {
  data: new SlashCommandBuilder()
    .setName('scan')
    .setDescription('Fetch up to 10,000 past messages and process attachments for pinning'),
  async execute(interaction) {
    try {
      requireGuild(interaction);

      const guildId = interaction.guildId!;
      const channelId = interaction.channelId;

      logger.debug('Executing scan command', {
        guildId,
        channelId,
        userId: interaction.user.id,
      });

      const botMember = requireBotPermissions(
        interaction,
        PermissionsBitField.Flags.ViewChannel | PermissionsBitField.Flags.ManageMessages, // Scan needs both
      );

      const channel = await service.fetchChannelWithPermissions(
        channelId,
        botMember,
        PermissionsBitField.Flags.ViewChannel | PermissionsBitField.Flags.ManageMessages,
      );

      if (!channel) {
        logger.warn('Bot lacks required permissions for channel', { channelId, guildId });
        await interaction.reply({
          content: 'The bot does not have permission to view or manage messages in this channel.',
          ephemeral: true,
        });
        return;
      }

      await interaction.deferReply({ ephemeral: true });
      logger.info('Starting message scan in channel', { channelId, guildId, limit: MAX_MESSAGES });

      try {
        await service.processExistingMessages(channel, MAX_MESSAGES, true);
        await interaction.editReply('Processing completed successfully in this channel.');

        logger.info('Scan completed successfully', { channelId, guildId });
      } catch (error) {
        logger.error('Error during scan operation', error instanceof Error ? error : new Error('Unknown error'), {
          channelId,
          guildId,
        });
        await interaction.editReply('An error occurred during processing. Check the pin limit or permissions.');
      }
    } catch (error) {
      await handleCommandError(error, interaction);
    }
  },
};
