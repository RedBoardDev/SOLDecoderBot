import { ChannelService } from '@services/channel-service';
import type { Command } from '@type/command';
import { SlashCommandBuilder, type CommandInteraction } from 'discord.js';

const service = new ChannelService();

export const monitored: Command = {
  data: new SlashCommandBuilder().setName('monitored').setDescription('Lists all monitored channels in this server'),
  async execute(interaction: CommandInteraction): Promise<void> {
    if (!interaction.guildId) {
      await interaction.reply({ content: 'This command must be used in a server.', ephemeral: true });
      return;
    }

    const channelIds = service.getMonitoredChannels(interaction.guildId);
    if (channelIds.length === 0) {
      await interaction.reply({ content: 'No monitored channels in this server.', ephemeral: true });
    } else {
      const channelMentions = channelIds.map((id) => `<#${id}>`).join(', ');
      await interaction.reply({ content: `Monitored channels: ${channelMentions}`, ephemeral: true });
    }
  },
};
