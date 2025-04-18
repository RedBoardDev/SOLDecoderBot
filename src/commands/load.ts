import { ChannelService } from '@services/channel-service';
import type { Command } from '@type/command';
import { type CommandInteraction, SlashCommandBuilder } from 'discord.js';

const service = new ChannelService();
const MAX_MESSAGES = 10000;

export const load: Command = {
  data: new SlashCommandBuilder().setName('load').setDescription("Charge et traite jusqu'à 10 000 messages existants"),
  async execute(interaction: CommandInteraction): Promise<void> {
    const guildId = interaction.guildId;
    if (!guildId) {
      await interaction.reply('Cette commande doit être utilisée dans un serveur.');
      return;
    }
    const monitoredChannels = service.getMonitoredChannels(guildId);
    if (monitoredChannels.length === 0) {
      await interaction.reply('Aucun salon surveillé.');
      return;
    }
    await interaction.deferReply({ ephemeral: true });
    try {
      for (const channelId of monitoredChannels) {
        const channel = await interaction.client.channels.fetch(channelId);
        if (!channel?.isTextBased()) continue;
        await service.processExistingMessages(channel, MAX_MESSAGES);
      }
      await interaction.editReply('Traitement terminé.');
    } catch (error) {
      console.error(error);
      await interaction.editReply('Erreur lors du traitement.');
    }
  },
};
