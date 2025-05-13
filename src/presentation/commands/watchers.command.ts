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
import { InitGuildSettingsUseCase } from '../../application/use-cases/init-guild-settings.use-case';
import { DynamoGuildSettingsRepository } from '../../infrastructure/repositories/dynamo-guild-settings-repository';
import { buildDashboardEmbed } from '../components/dashboard/embeds';
import { UserError } from '../../application/errors/application-errors';
import { logger } from '../../shared/logger';

export const watchersCommand = {
  data: new SlashCommandBuilder()
    .setName('watchers')
    .setDescription('Displays the main dashboard')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    if (!interaction.guildId) throw new UserError('This command must be used in a server.');

    const repo = new DynamoGuildSettingsRepository();
    const getUC = new GetGuildSettingsUseCase(repo);
    let settings = await getUC.execute(interaction.guildId);

    if (!settings) {
      const initUC = new InitGuildSettingsUseCase(repo);
      await initUC.execute(interaction.guildId);
      settings = await getUC.execute(interaction.guildId);
    }

    const embed = buildDashboardEmbed(settings!.timezone);
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

    try {
      await interaction.editReply({ embeds: [embed], components });
    } catch (err) {
      logger.error('watchersCommand failed to reply', err as Error);
    }
  },
};
