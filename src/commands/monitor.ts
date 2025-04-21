import { SlashCommandBuilder, type ChatInputCommandInteraction } from 'discord.js';
import type { Command } from '@type/command';
import { ChannelService } from '@services/channel-service';
import {
  addSettingsOptions,
  getSettingsFromInteraction,
  formatSettingsParts,
} from './utils/settings';

const service = new ChannelService();

export const monitor: Command = {
  data: addSettingsOptions(
    new SlashCommandBuilder()
      .setName('monitor')
      .setDescription('Start monitoring this channel for attachments with optional image/embed and tagging')
  ),
  async execute(interaction: ChatInputCommandInteraction) {
    const guildId = interaction.guildId;
    const channelId = interaction.channelId;
    if (!guildId || !channelId) {
      await interaction.reply({
        content: 'Cette commande doit être utilisée dans un salon de serveur.',
        ephemeral: true,
      });
      return;
    }

    const settings = getSettingsFromInteraction(interaction);
    service.addChannel(guildId, channelId, settings);

    const base = `Le salon <#${channelId}> a été ajouté à la liste des canaux surveillés.`;
    const parts = formatSettingsParts(settings);

    await interaction.reply({
      content:
        parts.length > 0
          ? `${base}\n• ${parts.join('\n• ')}`
          : base,
      ephemeral: true,
    });
  },
};
