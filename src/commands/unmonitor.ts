import { ChannelService } from '@services/channel-service';
import type { Command } from '@type/command';
import { SlashCommandBuilder, type CommandInteraction } from 'discord.js';

const service = new ChannelService();

export const unmonitor: Command = {
  data: new SlashCommandBuilder()
    .setName('unmonitor')
    .setDescription('Removes the current channel from the monitored list'),
  async execute(interaction: CommandInteraction): Promise<void> {
    if (!interaction.guildId || !interaction.channelId) {
      await interaction.reply({ content: 'This command must be used in a server channel.', ephemeral: true });
      return;
    }

    service.removeChannel(interaction.guildId, interaction.channelId);
    await interaction.reply({
      content: `The channel <#${interaction.channelId}> has been removed from the monitored list.`,
      ephemeral: true,
    });
  },
};