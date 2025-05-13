import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import type { WalletWatch } from '../../../domain/entities/wallet-watch';

export function buildWalletsListButtons(watches: WalletWatch[]): ActionRowBuilder<ButtonBuilder>[] {
  return watches.map((w, idx) =>
    new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(`watchers:viewWallet:${w.address}:${w.channelId}`)
        .setLabel(`Wallet ${idx + 1}`)
        .setStyle(ButtonStyle.Primary),

      new ButtonBuilder()
        .setCustomId(`watchers:toggleNotify:${w.address}:${w.channelId}`)
        .setLabel(w.notifyOnClose ? '🔔 ON' : '🔕 OFF')
        .setStyle(ButtonStyle.Secondary),

      new ButtonBuilder()
        .setCustomId(`watchers:deleteWallet:${w.address}:${w.channelId}`)
        .setLabel('🗑️ Delete')
        .setStyle(ButtonStyle.Danger),
    ),
  );
}

export function buildWalletsAddButton(): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId('watchers:addWallet').setLabel('➕ Add a wallet').setStyle(ButtonStyle.Success),
  );
}
