import {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} from 'discord.js';
import type { WalletWatch } from '../../domain/entities/wallet-watch';
import { FrequencyVO } from '../../domain/value-objects/frequency';

export function buildWalletsDashboardComponents(watches: WalletWatch[]): ActionRowBuilder<ButtonBuilder>[] {
  const rows: ActionRowBuilder<ButtonBuilder>[] = [];
  const chunkSize = 5;

  for (let i = 0; i < watches.length; i += chunkSize) {
    const chunk = watches.slice(i, i + chunkSize);
    const row = new ActionRowBuilder<ButtonBuilder>();
    chunk.forEach((w) => {
      row.addComponents(
        new ButtonBuilder()
          .setCustomId(`watchers:viewWallet:${w.address}`)
          .setLabel(w.address.slice(0, 16))
          .setStyle(ButtonStyle.Primary),
      );
    });
    rows.push(row);
  }

  return rows;
}

export function buildWalletsAddComponent(): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId('watchers:addWallet').setLabel('➕ Add a wallet').setStyle(ButtonStyle.Success),
  );
}

export function buildSingleWalletComponents(): ActionRowBuilder<ButtonBuilder>[] {
  return [];
}

export function buildWalletsEmbed(watches: WalletWatch[]): EmbedBuilder {
  const intro = [
    '**Wallets Dashboard**',
    'Manage each wallet–channel pairing you’ve set up in this server.',
    'Below you’ll see which channel it posts into, and whether “Notify on Close” is enabled.',
    '',
  ].join('\n');

  const legend = [
    '**Buttons per line:**',
    '• **Settings** – open more settings for this wallet',
    '• **🔔/🔕** – toggle close‐position notifications in this channel',
    '• **🗑️ Delete** – remove this wallet–channel pairing',
    '',
  ].join('\n');

  const listDescription =
    watches.length === 0
      ? '_No wallets are currently being watched._'
      : watches
          .map(
            (w, i) =>
              `**${i + 1}.**\n` +
              `• **Wallet :** \`${w.address}\`\n` +
              `• **Channel :** <#${w.channelId}>\n` +
              `• **Notify on Close :** ${w.notifyOnClose ? '✅' : '❌'}`,
          )
          .join('\n');

  const description = [intro, listDescription, legend].join('\n\n');
  return new EmbedBuilder()
    .setTitle(`📋 Watched Wallets (${watches.length})`)
    .setDescription(description)
    .setColor(0x00ae86);
}

export function buildWalletsComponents(watches: WalletWatch[]): ActionRowBuilder<ButtonBuilder>[] {
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

export function buildSingleWalletEmbed(w: WalletWatch): EmbedBuilder {
  const tagDisplay = w.tagId ? (w.tagType === 'USER' ? `<@${w.tagId}>` : `<@&${w.tagId}>`) : '_None_';

  const intro = [
    '**🔍 Wallet–Channel Pairing Details**',
    'Review and tweak every setting for this wallet in the selected channel.',
    '',
  ].join('\n');

  const settings = [
    `**Wallet Address:** \`${w.address}\``,
    `**Channel:** <#${w.channelId}>`,
    `**Notify on Close:** ${w.notifyOnClose ? '✅ Enabled' : '❌ Disabled'}`,
    `**Threshold:** ±${w.threshold.value}%`,
    `**Image Attachments:** ${w.image ? '✅ Enabled' : '❌ Disabled'}`,
    `**Pin Messages:** ${w.pin ? '✅ Enabled' : '❌ Disabled'}`,
    `**Tag on Notify:** ${tagDisplay}`,
    `**Daily Summary:** ${w.summaryDaily ? '✅ On' : '❌ Off'}`,
    `**Weekly Summary:** ${w.summaryWeekly ? '✅ On' : '❌ Off'}`,
    `**Monthly Summary:** ${w.summaryMonthly ? '✅ On' : '❌ Off'}`,
  ].join('\n');

  const legend = [
    '',
    '**Action Buttons:**',
    '• **Threshold** – open modal to set ±% threshold',
    '• **📷 ON/OFF** – toggle image attachments on notify',
    '• **📌 ON/OFF** – toggle pinning the notification message',
    '• **DAY / WEEK / MONTH** – toggle daily/weekly/monthly summary',
    '• **🏷️ Tag** – select or clear a user/role mention',
    '• **🔙 Back** – return to the wallets list',
  ].join('\n');

  const description = [intro, settings, legend].join('\n\n');

  return new EmbedBuilder().setTitle('🔍 Wallet Details').setDescription(description).setColor(0x00ae86);
}

export function buildWalletsBackComponent(customId: string): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(customId).setLabel('🔙 Back').setStyle(ButtonStyle.Secondary),
  );
}

export function buildWalletsListComponents(watches: WalletWatch[]): ActionRowBuilder<ButtonBuilder>[] {
  return watches.map((w, i) =>
    new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(`wallet:detail:${w.address}`)
        .setLabel(`Wallet ${i + 1}`)
        .setStyle(ButtonStyle.Primary),
    ),
  );
}

export function buildWalletDetailComponents(w: WalletWatch): ActionRowBuilder<ButtonBuilder>[] {
  const rows: ActionRowBuilder<ButtonBuilder>[] = [];

  rows.push(
    new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(`wallet:editThreshold:${w.address}`)
        .setLabel('⚙️ Threshold')
        .setStyle(ButtonStyle.Primary),

      new ButtonBuilder()
        .setCustomId(`wallet:toggleImage:${w.address}`)
        .setLabel(w.image ? '📷 ON' : '📷 OFF')
        .setStyle(ButtonStyle.Secondary),

      new ButtonBuilder()
        .setCustomId(`wallet:togglePin:${w.address}`)
        .setLabel(w.pin ? '📌 ON' : '📌 OFF')
        .setStyle(ButtonStyle.Secondary),
    ),
  );

  rows.push(
    new ActionRowBuilder<ButtonBuilder>().addComponents(
      ...FrequencyVO.all().map((freq) =>
        new ButtonBuilder()
          .setCustomId(`wallet:toggleSummary:${freq}:${w.address}`)
          .setLabel(
            `${freq.toLowerCase()} ${
              (freq === 'DAY' ? w.summaryDaily : freq === 'WEEK' ? w.summaryWeekly : w.summaryMonthly) ? '✅' : '❌'
            }`,
          )
          .setStyle(ButtonStyle.Primary),
      ),
    ),
  );

  rows.push(
    new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId(`wallet:editTag:${w.address}`).setLabel('🏷️ Tag').setStyle(ButtonStyle.Primary),

      new ButtonBuilder()
        .setCustomId(`wallet:clearTag:${w.address}`)
        .setLabel('🚫 Clear Tag')
        .setStyle(ButtonStyle.Danger),
    ),
  );

  return rows;
}

export function buildThresholdModal(address: string): ModalBuilder {
  return new ModalBuilder()
    .setCustomId(`wallet:thresholdModal:${address}`)
    .setTitle('Update the threshold')
    .addComponents(
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder()
          .setCustomId('thresholdInput')
          .setLabel('Value (0.01-100, max 2 decimals)')
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
          .setPlaceholder('e.g. 1.23'),
      ),
    );
}
