import { SlashCommandBuilder } from 'discord.js';
import type { Command } from '@type/command';
import { ChannelService } from '@services/channel-service';
import { addSettingsOptions, getSettingsFromInteraction, formatSettingsParts } from './utils/settings';
import { requireGuild, handleCommandError, logger } from '../utils';

const service = new ChannelService();

export const settings: Command = {
  data: addSettingsOptions(
    new SlashCommandBuilder()
      .setName('settings')
      .setDescription('Configure pin behavior: image embedding and mention tagging'),
  ),
  async execute(interaction) {
    try {
      requireGuild(interaction);

      const guildId = interaction.guildId!;
      const channelId = interaction.channelId;

      logger.debug('Executing settings command', {
        guildId,
        channelId,
        userId: interaction.user.id,
      });

      const update = getSettingsFromInteraction(interaction);

      if (Object.keys(update).length === 0) {
        logger.debug('No settings parameters provided', {
          guildId,
          channelId,
        });

        await interaction.reply({
          content: 'You must specify either `image` or `tag` parameter.',
          ephemeral: true,
        });
        return;
      }

      service.updateSettings(guildId, channelId, update);

      logger.info('Channel settings updated', {
        guildId,
        channelId,
        settings: update,
      });

      await interaction.reply({
        content: `⚙️ Settings updated:\n• ${formatSettingsParts(update).join('\n• ')}`,
        ephemeral: true,
      });
    } catch (error) {
      await handleCommandError(error, interaction);
    }
  },
};
