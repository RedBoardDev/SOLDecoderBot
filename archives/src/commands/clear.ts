import { ChannelService } from '@services/channel-service';
import type { Command } from '@type/command';
import { SlashCommandBuilder, PermissionsBitField } from 'discord.js';
import { requireGuild, requireBotPermissions, handleCommandError, logger } from '../utils';

const service = new ChannelService();
const MAX_MESSAGES = 10_000;

export const clear: Command = {
  data: new SlashCommandBuilder()
    .setName('clear')
    .setDescription('Unpin up to 10,000 messages and delete bot posts in this channel'),
  async execute(interaction) {
    try {
      requireGuild(interaction);

      const guildId = interaction.guildId!;
      const channelId = interaction.channelId;

      logger.debug('Executing clear command', {
        guildId,
        channelId,
        userId: interaction.user.id,
      });

      const botMember = requireBotPermissions(interaction, PermissionsBitField.Flags.ManageMessages);

      const channel = await service.fetchChannelWithPermissions(
        channelId,
        botMember,
        PermissionsBitField.Flags.ManageMessages,
      );

      if (!channel) {
        logger.warn('Bot lacks required permissions for channel', { channelId, guildId });
        await interaction.reply({
          content: 'The bot does not have permission to manage messages in this channel.',
          ephemeral: true,
        });
        return;
      }

      await interaction.deferReply({ ephemeral: true });
      logger.info('Starting clear operation in channel', { channelId, guildId });

      try {
        await service.unpinExistingMessages(channel, MAX_MESSAGES);
        logger.debug('Unpinning completed, now deleting bot messages', { channelId });

        await service.deleteBotMessages(channel, MAX_MESSAGES);

        await interaction.editReply('Unpinning and bot message deletion completed successfully in this channel.');
        logger.info('Clear operation completed successfully', { channelId, guildId });
      } catch (error) {
        logger.error('Error during clear operation', error instanceof Error ? error : new Error('Unknown error'), {
          channelId,
          guildId,
        });
        await interaction.editReply('An error occurred during the clear operation.');
      }
    } catch (error) {
      await handleCommandError(error, interaction);
    }
  },
};
