import {
  SlashCommandBuilder,
  EmbedBuilder,
  ChatInputCommandInteraction,
} from 'discord.js';
import type { Command } from '@type/command';
import { ChannelService } from '@services/channel-service';
import { formatSettingsParts } from './utils/settings';

const service = new ChannelService();

export const monitored: Command = {
  data: new SlashCommandBuilder()
    .setName('monitored')
    .setDescription('Liste les salons surveillés et leurs paramètres'),
  async execute(interaction: ChatInputCommandInteraction) {
    const guildId = interaction.guildId;
    if (!guildId) {
      await interaction.reply({
        content: 'Doit être appelé dans un serveur.',
        ephemeral: true,
      });
      return;
    }

    const channelIds = service.getMonitoredChannels(guildId);
    if (channelIds.length === 0) {
      await interaction.reply({
        content: 'Aucun salon surveillé.',
        ephemeral: true,
      });
      return;
    }

    const embed = new EmbedBuilder()
      .setTitle('Salons surveillés')
      .setDescription('🔧 Paramètres par salon :');

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
