import { EmbedBuilder } from 'discord.js';
import type { HistoricalPosition } from '../../../schemas/position-response.schema';
import type { Frequency } from '../../../domain/value-objects/frequency';

export function buildSummaryEmbed(
  freq: Frequency,
  wallet: string,
  _tz: string,
  positions: HistoricalPosition[],
  startUtc: Date,
  endUtc: Date,
): EmbedBuilder {
  const totalTrades = positions.length;

  const totalPct = positions.reduce((sum, p) => sum + p.percent, 0);

  const totalSol = positions.reduce((sum, p) => sum + p.pnlSol, 0);
  const totalUsd = positions.reduce((sum, p) => sum + p.pnlUsd, 0);

  const fmtDate = (d: Date) => d.toLocaleDateString('en-US');
  const fmtTime = (d: Date) => d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

  return new EmbedBuilder()
    .setTitle(`📊 ${freq} Performance Summary`)
    .setDescription(
      `Wallet: [${wallet}](https://app.lpagent.io/portfolio?address=${wallet})\n` +
        `Here’s how the wallet performed over the past **${freq.toLowerCase()}**(s).`,
    )
    .addFields(
      {
        name: '💹 Overall Performance',
        value:
          `Win rate: **${totalPct.toFixed(2)}%**\n` +
          `Total PnL: **${totalSol.toFixed(2)} SOL ($${totalUsd.toFixed(2)})**`,
        inline: true,
      },
      {
        name: '📈 Total Trades',
        value: `${totalTrades}`,
        inline: true,
      },
    )
    .setFooter({
      text: `Stats from ${fmtDate(startUtc)} to ${fmtDate(endUtc)} • ${fmtTime(new Date())}`,
    })
    .setColor(totalPct >= 0 ? 0x00b0f4 : 0xd62839);
}
