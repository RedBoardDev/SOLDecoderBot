import { SlashCommandBuilder, type ChatInputCommandInteraction } from 'discord.js';
import type { Command } from '@type/command';
import { ChannelService } from '@services/channel-service';
import {
  addSettingsOptions,
  getSettingsFromInteraction,
  formatSettingsParts,
} from './utils/settings';

const service = new ChannelService();

export const settings: Command = {
  data: addSettingsOptions(
    new SlashCommandBuilder()
      .setName('settings')
      .setDescription('Configure this channel’s pin settings')
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

    const update = getSettingsFromInteraction(interaction);
    if (Object.keys(update).length === 0) {
      await interaction.reply({
        content: 'Vous devez préciser `image` et/ou `tag`.',
        ephemeral: true,
      });
      return;
    }

    service.updateSettings(guildId, channelId, update);
    const parts = formatSettingsParts(update);

    await interaction.reply({
      content: `⚙️ Paramètres mis à jour pour ce salon :\n• ${parts.join('\n• ')}`,
      ephemeral: true,
    });
  },
};
