import { ChannelService } from '@services/channel-service';
import type { Command } from '@type/command';
import { type CommandInteraction, SlashCommandBuilder } from 'discord.js';

const service = new ChannelService();

export const monitored: Command = {
  data: new SlashCommandBuilder().setName('monitored').setDescription('Liste tous les salons surveillés dans ce serveur'),
  async execute(interaction: CommandInteraction): Promise<void> {
    const guildId = interaction.guildId;
    if (!guildId) {
      await interaction.reply('Cette commande doit être utilisée dans un serveur.');
      return;
    }
    const monitoredChannels = service.getMonitoredChannels(guildId);
    if (monitoredChannels.length === 0) {
      await interaction.reply({
        content: 'Aucun salon surveillé dans ce serveur.',
        ephemeral: true,
      });
    } else {
      const channelMentions = monitoredChannels.map((id) => `<#${id}>`).join(', ');
      await interaction.reply({
        content: `Salons surveillés : ${channelMentions}`,
        ephemeral: true,
      });
    }
  },
};
