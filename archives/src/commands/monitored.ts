import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import type { Command } from '@type/command';
import { ChannelService } from '@services/channel-service';
import { formatSettingsParts } from './utils/settings';
import { requireGuild, handleCommandError, logger } from '../utils';

const service = new ChannelService();

export const monitored: Command = {
  data: new SlashCommandBuilder()
    .setName('monitored')
    .setDescription('List all monitored channels along with their current settings'),
  async execute(interaction) {
    try {
      requireGuild(interaction);

      const guildId = interaction.guildId!;

      logger.debug('Executing monitored command', {
        guildId,
        userId: interaction.user.id,
      });

      const channelIds = service.getMonitoredChannels(guildId);
      logger.debug('Retrieved monitored channels', {
        guildId,
        count: channelIds.length,
      });

      if (channelIds.length === 0) {
        logger.debug('No monitored channels found', { guildId });
        await interaction.reply({
          content: 'No monitored channels found.',
          ephemeral: true,
        });
        return;
      }

      const embed = new EmbedBuilder().setTitle('Monitored Channels').setDescription('🔧 Channel settings:');

      const fields = channelIds.map((cid) => {
        const settings = service.getChannelSettings(guildId, cid);
        const parts = formatSettingsParts(settings);
        return {
          name: `<#${cid}>`,
          value: parts.length > 0 ? parts.join('\n') : 'Default settings',
          inline: false,
        };
      });

      embed.addFields(fields);

      logger.debug('Sending monitored channels list', {
        guildId,
        channelCount: channelIds.length,
      });

      await interaction.reply({ embeds: [embed], ephemeral: true });
    } catch (error) {
      await handleCommandError(error, interaction);
    }
  },
};
