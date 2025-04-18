import { ChannelService } from '@services/channel-service';
import type { Command } from '@type/command';
import { type CommandInteraction, SlashCommandBuilder } from 'discord.js';

const service = new ChannelService();

export const add: Command = {
  data: new SlashCommandBuilder()
    .setName('add')
    .setDescription('Ajoute le salon actuel à la liste des salons surveillés'),
  async execute(interaction: CommandInteraction): Promise<void> {
    const guildId = interaction.guildId;
    const channelId = interaction.channelId;
    if (!guildId || !channelId) {
      await interaction.reply({
        content: `Le salon <#${channelId}> a été ajouté à la liste des salons surveillés.`,
        ephemeral: true,
      });
      return;
    }
    service.addChannel(guildId, channelId);
    await interaction.reply(`Le salon <#${channelId}> a été ajouté à la liste des salons surveillés.`);
  },
};
