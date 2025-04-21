import { SlashCommandBuilder, type ChatInputCommandInteraction } from 'discord.js';
import type { Command } from '@type/command';
import { ChannelService } from '@services/channel-service';
import { addSettingsOptions, getSettingsFromInteraction, formatSettingsParts } from './utils/settings';

const service = new ChannelService();

export const settings: Command = {
  data: addSettingsOptions(
    new SlashCommandBuilder()
      .setName('settings')
      .setDescription('Configure pin behavior: image embedding and mention tagging'),
  ),
  async execute(interaction: ChatInputCommandInteraction) {
    const guildId = interaction.guildId!;
    const channelId = interaction.channelId!;
    const update = getSettingsFromInteraction(interaction);
    if (Object.keys(update).length === 0) {
      await interaction.reply({
        content: 'You must specify either `image` or `tag` parameter.',
        ephemeral: true,
      });
      return;
    }
    service.updateSettings(guildId, channelId, update);
    await interaction.reply({
      content: `⚙️ Settings updated:\n• ${formatSettingsParts(update).join('\n• ')}`,
      ephemeral: true,
    });
  },
};
