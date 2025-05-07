import {
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
  ChannelType,
  PermissionFlagsBits,
  MessageFlags,
} from 'discord.js';
import { RemoveWatcherUseCase } from '../../application/use-cases/remove-watcher.use-case';
import { DynamoWatcherRepository } from '../../infrastructure/repositories/dynamo-watcher-repository';
import { docClient } from '../../infrastructure/config/aws';
import { logger } from '../../shared/logger';
import { UserError } from '../../application/errors/application-errors';

export const unwatchCommand = {
  data: new SlashCommandBuilder()
    .setName('unwatch')
    .setDescription("Stop watching a channel for '🟨Closed' messages")
    .addChannelOption((opt) =>
      opt
        .setName('channel')
        .setDescription('Channel to stop watching (optional)')
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(false),
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction: ChatInputCommandInteraction) {
    const flags = MessageFlags.Ephemeral;
    const useCase = new RemoveWatcherUseCase(new DynamoWatcherRepository(docClient));

    try {
      if (!interaction.guildId) {
        throw new UserError('This command must be used in a server.');
      }
      const target = interaction.options.getChannel('channel') ?? interaction.channel;
      if (!target || target.type !== ChannelType.GuildText) {
        throw new UserError('Invalid text channel.');
      }

      await interaction.deferReply({ flags });
      await useCase.execute({ guildId: interaction.guildId, channelId: target.id });
      await interaction.editReply({ content: `✅ No longer watching <#${target.id}>.` });
    } catch (err: unknown) {
      const alreadyReplied = interaction.deferred || interaction.replied;
      if (err instanceof UserError) {
        if (alreadyReplied) {
          await interaction.editReply({ content: `❌ ${err.message}` });
        } else {
          await interaction.reply({ content: `❌ ${err.message}`, flags });
        }
      } else {
        logger.error('unwatchCommand failed', err instanceof Error ? err : new Error(String(err)));
        const msg = '❌ Internal error, please try again later.';
        if (alreadyReplied) {
          await interaction.editReply({ content: msg });
        } else {
          await interaction.reply({ content: msg, flags });
        }
      }
    }
  },
};
