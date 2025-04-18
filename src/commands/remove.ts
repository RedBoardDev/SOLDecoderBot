import { ChannelService } from '@services/channel-service';
import type { Command } from '@type/command';
import { type CommandInteraction, SlashCommandBuilder } from 'discord.js';

const service = new ChannelService();

export const remove: Command = {
  data: new SlashCommandBuilder()
    .setName('remove')
    .setDescription('Retire le salon actuel de la liste des salons surveillés'),
  async execute(interaction: CommandInteraction): Promise<void> {
    const guildId = interaction.guildId;
    const channelId = interaction.channelId;
    if (!guildId || !channelId) {
      await interaction.reply({
        content: `Le salon <#${channelId}> a été retiré de la liste des salons surveillés.`,
        ephemeral: true,
      });
      return;
    }
    service.removeChannel(guildId, channelId);
    await interaction.reply(`Le salon <#${channelId}> a été retiré de la liste des salons surveillés.`);
  },
};
