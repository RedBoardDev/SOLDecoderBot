import { EmbedBuilder } from 'discord.js';
import type { WalletWatch } from '../../../domain/entities/wallet-watch';

export function buildWalletsListEmbed(watches: WalletWatch[]): EmbedBuilder {
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

  return new EmbedBuilder()
    .setTitle(`📋 Watched Wallets (${watches.length})`)
    .setDescription([intro, listDescription, legend].join('\n\n'))
    .setColor(0x00ae86);
}

export function buildWalletDetailEmbed(w: WalletWatch): EmbedBuilder {
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
    `**Threshold:** ±${w.threshold}%`,
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

  return new EmbedBuilder()
    .setTitle('🔍 Wallet Details')
    .setDescription([intro, settings, legend].join('\n\n'))
    .setColor(0x00ae86);
}
