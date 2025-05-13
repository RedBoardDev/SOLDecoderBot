import { EmbedBuilder } from 'discord.js';

export function buildDashboardEmbed(timezone: string): EmbedBuilder {
  const description = [
    '**What is SolDecoderBot?**',
    'SolDecoderBot lets you watch and get notified whenever the SolDecoder strategy closes a position on-chain.',
    'You can also configure automatic recaps on a daily, weekly or monthly basis.',
    '',
    '**Server-Scoped Configuration**',
    'All settings live at the server level, not per user. You pair wallets with channels, so you can watch the same wallet in many channels or many wallets in one channel.',
    '',
    '**Recaps**',
    'Recaps are configured **per wallet** (not per wallet–channel pairing).',
    'A recap for a wallet will include **all** its activity, regardless of which channel(s) it was posted in.',
    '',
    '**Time Zone**',
    'Your chosen time zone determines when recaps are sent so they arrive at the right local time.',
    `Current time zone: **${timezone}**`,
    '',
    '**Actions**',
    'Use the buttons below to:',
    '• Change your time zone',
    '• Manage your watched wallets',
  ].join('\n');

  return new EmbedBuilder().setTitle('📊 Dashboard SolDecoderBot').setDescription(description).setColor(0x00ae86);
}
