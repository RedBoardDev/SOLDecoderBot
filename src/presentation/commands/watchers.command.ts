import {
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
  PermissionFlagsBits,
  MessageFlags,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from 'discord.js';
import { GetGuildSettingsUseCase } from '../../application/use-cases/get-guild-settings.use-case';
import { DynamoGuildSettingsRepository } from '../../infrastructure/repositories/dynamo-guild-settings-repository';
import { logger } from '../../shared/logger';
import { UserError } from '../../application/errors/application-errors';
import { buildWatchersEmbed } from '../utils/watchers-ui';

export const watchersCommand = {
  data: new SlashCommandBuilder()
    .setName('watchers')
    .setDescription('Displays the main dashboard')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction: ChatInputCommandInteraction) {
    const flags = MessageFlags.Ephemeral;
    await interaction.deferReply({ flags });

    if (!interaction.guildId) {
      throw new UserError('This command must be used in a server.');
    }

    try {
      const settingsUseCase = new GetGuildSettingsUseCase(new DynamoGuildSettingsRepository());
      const settings = await settingsUseCase.execute(interaction.guildId);

      const embed = buildWatchersEmbed(settings.timezone);

      const components = [
        new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder()
            .setCustomId('watchers:setTimezone')
            .setLabel('⏰ Set Timezone')
            .setStyle(ButtonStyle.Primary),
          new ButtonBuilder()
            .setCustomId('watchers:walletSettings')
            .setLabel('⚙️ Wallet Settings')
            .setStyle(ButtonStyle.Secondary),
        ),
      ];

      await interaction.editReply({ embeds: [embed], components });
    } catch (err: unknown) {
      logger.error('watchersCommand failed', err instanceof Error ? err : new Error(String(err)));
      await interaction.editReply({ content: 'Interla error, please try again later.' });
    }
  },
};
