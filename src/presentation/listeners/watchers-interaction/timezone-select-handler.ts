import type { StringSelectMenuInteraction } from 'discord.js';
import { DynamoGuildSettingsRepository } from '../../../infrastructure/repositories/dynamo-guild-settings-repository';
import { GuildSettings } from '../../../domain/entities/guild-settings';
import { buildDashboardEmbed } from '../../components/dashboard/embeds';
import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';

export async function handleTimezoneSelect(interaction: StringSelectMenuInteraction) {
  if (interaction.customId !== 'watchers:selectTimezone') return;

  await interaction.deferUpdate();
  const guildId = interaction.guildId!;
  const tz = interaction.values[0]!;

  const repo = new DynamoGuildSettingsRepository();
  await repo.patch({ guildId, timezone: tz });

  const updated = GuildSettings.create({ guildId, timezone: tz });

  const embed = buildDashboardEmbed(updated.timezone);
  const components = [
    new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId('watchers:setTimezone').setLabel('⏰ Set Timezone').setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('watchers:walletSettings')
        .setLabel('⚙️ Wallet Settings')
        .setStyle(ButtonStyle.Secondary),
    ),
  ];

  await interaction.editReply({ embeds: [embed], components });
}
