import { SlashCommandBuilder, EmbedBuilder, type ChatInputCommandInteraction } from 'discord.js';
import type { Command } from '@type/command';
import { ChannelService } from '@services/channel-service';
import { formatSettingsParts } from './utils/settings';

const service = new ChannelService();

export const monitored: Command = {
  data: new SlashCommandBuilder()
    .setName('monitored')
    .setDescription('List all monitored channels along with their current settings'),
  async execute(interaction: ChatInputCommandInteraction) {
    const guildId = interaction.guildId;
    if (!guildId) {
      await interaction.reply({
        content: 'This command must be used in a server.',
        ephemeral: true,
      });
      return;
    }

    const channelIds = service.getMonitoredChannels(guildId);
    if (channelIds.length === 0) {
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
        value: parts.join('\n'),
        inline: false,
      };
    });

    embed.addFields(fields);

    await interaction.reply({ embeds: [embed], ephemeral: true });
  },
};
