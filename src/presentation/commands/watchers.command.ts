import { SlashCommandBuilder, type ChatInputCommandInteraction, PermissionFlagsBits, MessageFlags } from 'discord.js';
import { ListWatchersUseCase } from '../../application/use-cases/list-watchers.use-case';
import { DynamoWatcherRepository } from '../../infrastructure/repositories/dynamo-watcher-repository';
import { docClient } from '../../infrastructure/config/aws';
import { logger } from '../../shared/logger';
import { UserError } from '../../application/errors/application-errors';
import { buildWatchersEmbed, buildWatchersComponents } from '../utils/watchers-ui';

export const watchersCommand = {
  data: new SlashCommandBuilder()
    .setName('watchers')
    .setDescription('Displays the dashboard of watched channels')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction: ChatInputCommandInteraction) {
    const flags = MessageFlags.Ephemeral;
    const useCase = new ListWatchersUseCase(new DynamoWatcherRepository(docClient));

    try {
      if (!interaction.guildId) {
        throw new UserError('This command must be used in a server.');
      }
      await interaction.deferReply({ flags });

      const watchers = await useCase.execute({ guildId: interaction.guildId });
      if (watchers.length === 0) {
        await interaction.editReply({ content: 'No watched channels for this server.' });
        return;
      }

      const embed = buildWatchersEmbed(watchers);
      const components = buildWatchersComponents(watchers);

      await interaction.editReply({ embeds: [embed], components });
    } catch (err: unknown) {
      const already = interaction.deferred || interaction.replied;
      if (err instanceof UserError) {
        if (already) {
          await interaction.editReply({ content: `❌ ${err.message}` });
        } else {
          await interaction.reply({ content: `❌ ${err.message}`, flags });
        }
      } else {
        logger.error('watchersCommand failed', err instanceof Error ? err : new Error(String(err)));
        const msg = '❌ Internal error, please try again later.';
        if (already) {
          await interaction.editReply({ content: msg });
        } else {
          await interaction.reply({ content: msg, flags });
        }
      }
    }
  },
};
