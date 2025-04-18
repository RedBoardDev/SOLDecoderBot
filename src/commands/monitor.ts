import { ChannelService } from '@services/channel-service';
import type { Command } from '@type/command';
import { SlashCommandBuilder, type CommandInteraction } from 'discord.js';

const service = new ChannelService();

export const monitor: Command = {
  data: new SlashCommandBuilder().setName('monitor').setDescription('Adds the current channel to the monitored list'),
  async execute(interaction: CommandInteraction): Promise<void> {
    if (!interaction.guildId || !interaction.channelId) {
      await interaction.reply({ content: 'This command must be used in a server channel.', ephemeral: true });
      return;
    }

    service.addChannel(interaction.guildId, interaction.channelId);
    await interaction.reply({
      content: `The channel <#${interaction.channelId}> has been added to the monitored list.`,
      ephemeral: true,
    });
  },
};
