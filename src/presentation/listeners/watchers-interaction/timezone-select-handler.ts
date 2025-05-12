import type { StringSelectMenuInteraction } from 'discord.js';
import { DynamoGuildSettingsRepository } from '../../../infrastructure/repositories/dynamo-guild-settings-repository';
import { GuildSettings } from '../../../domain/entities/guild-settings';
import { buildWatchersEmbed } from '../../utils/watchers-ui';
import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';

export async function handleTimezoneSelect(interaction: StringSelectMenuInteraction) {
  if (interaction.customId !== 'watchers:selectTimezone') return;

  const selectedTz = interaction.values[0]!;
  const guildId = interaction.guildId!;
  const repo = new DynamoGuildSettingsRepository();
  const settingsEntity = GuildSettings.create({ guildId, timezone: selectedTz });
  await repo.save(settingsEntity);

  const embed = buildWatchersEmbed(settingsEntity.timezone);
  const components = [
    new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId('watchers:setTimezone').setLabel('⏰ Set Timezone').setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('watchers:walletSettings')
        .setLabel('⚙️ Wallet Settings')
        .setStyle(ButtonStyle.Secondary),
    ),
  ];
  await interaction.update({ embeds: [embed], components });
}
