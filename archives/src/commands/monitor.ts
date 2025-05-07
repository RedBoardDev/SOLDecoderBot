import { SlashCommandBuilder } from 'discord.js';
import type { Command } from '@type/command';
import { ChannelService } from '@services/channel-service';
import { addSettingsOptions, getSettingsFromInteraction, formatSettingsParts } from './utils/settings';
import { requireGuild, handleCommandError, logger } from '../utils';

const service = new ChannelService();

export const monitor: Command = {
  data: addSettingsOptions(
    new SlashCommandBuilder()
      .setName('monitor')
      .setDescription('Start monitoring this channel for attachments with optional image/embed and tagging'),
  ),
  async execute(interaction) {
    try {
      requireGuild(interaction);

      const guildId = interaction.guildId!;
      const channelId = interaction.channelId;

      logger.debug('Executing monitor command', {
        guildId,
        channelId,
        userId: interaction.user.id,
      });

      const settings = getSettingsFromInteraction(interaction);

      service.addChannel(guildId, channelId, settings);

      logger.info('Channel added to monitoring', {
        guildId,
        channelId,
        settings,
      });

      const base = `Channel <#${channelId}> has been added to the monitored channels list.`;
      const parts = formatSettingsParts(settings);

      await interaction.reply({
        content: parts.length > 0 ? `${base}\n• ${parts.join('\n• ')}` : base,
        ephemeral: true,
      });
    } catch (error) {
      await handleCommandError(error, interaction);
    }
  },
};
