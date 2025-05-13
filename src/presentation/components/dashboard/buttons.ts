import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';

export function buildDashboardButtons(): ActionRowBuilder<ButtonBuilder>[] {
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId('watchers:setTimezone').setLabel('🌐 Timezone').setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId('watchers:walletSettings')
      .setLabel('⚙️ Wallet Settings')
      .setStyle(ButtonStyle.Secondary),
  );
  return [row];
}
