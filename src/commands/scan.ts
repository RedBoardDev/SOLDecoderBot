import { ChannelService } from '@services/channel-service';
import type { Command } from '@type/command';
import { type CommandInteraction, SlashCommandBuilder, PermissionsBitField } from 'discord.js';

const service = new ChannelService();
const MAX_MESSAGES = 10000;

export const scan: Command = {
  data: new SlashCommandBuilder().setName('scan').setDescription("Charge et traite jusqu'à 10 000 messages existants"),
  async execute(interaction: CommandInteraction): Promise<void> {
    const guildId = interaction.guildId;
    if (!guildId) {
      await interaction.reply('Cette commande doit être utilisée dans un serveur.');
      return;
    }

    const botMember = interaction.guild?.members.me;
    if (!botMember) {
      await interaction.reply('Impossible de récupérer les informations du bot.');
      return;
    }

    if (!service.checkBotPermissions(botMember, undefined, PermissionsBitField.Flags.ViewChannel)) {
      await interaction.reply("Le bot n'a pas la permission de voir les salons.");
      return;
    }

    const monitoredChannels = await service.fetchMonitoredChannels(guildId, botMember);
    if (monitoredChannels.length === 0) {
      await interaction.reply('Aucun salon surveillé avec les permissions nécessaires.');
      return;
    }

    await interaction.deferReply({ ephemeral: true });
    try {
      for (const channel of monitoredChannels) {
        await service.processExistingMessages(channel, MAX_MESSAGES);
      }
      await interaction.editReply('Traitement terminé.');
    } catch (error) {
      console.error('Erreur lors du traitement des messages:', error);
      await interaction.editReply('Erreur lors du traitement.');
    }
  },
};
