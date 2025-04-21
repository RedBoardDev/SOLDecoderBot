import { ChannelService } from '@services/channel-service';
import type { Command } from '@type/command';
import { SlashCommandBuilder } from 'discord.js';
import { requireGuild, handleCommandError, logger } from '../utils';

const service = new ChannelService();

export const unmonitor: Command = {
  data: new SlashCommandBuilder()
    .setName('unmonitor')
    .setDescription('Stop monitoring this channel and remove its configuration'),
  async execute(interaction) {
    try {
      requireGuild(interaction);

      const guildId = interaction.guildId!;
      const channelId = interaction.channelId;

      logger.debug('Executing unmonitor command', {
        guildId,
        channelId,
        userId: interaction.user.id,
      });

      service.removeChannel(guildId, channelId);

      logger.info('Channel removed from monitoring', {
        guildId,
        channelId,
      });

      await interaction.reply({
        content: `The channel <#${channelId}> has been removed from the monitored list.`,
        ephemeral: true,
      });
    } catch (error) {
      await handleCommandError(error, interaction);
    }
  },
};
