import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { FrequencyVO } from '../../../domain/value-objects/frequency';
import type { WalletWatch } from '../../../domain/entities/wallet-watch';

export function buildWalletDetailButtons(w: WalletWatch): ActionRowBuilder<ButtonBuilder>[] {
  const rows: ActionRowBuilder<ButtonBuilder>[] = [];

  rows.push(
    new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(`wallet:editThreshold:${w.address}:${w.channelId}`)
        .setLabel('⚙️ Threshold')
        .setStyle(ButtonStyle.Primary),

      new ButtonBuilder()
        .setCustomId(`wallet:toggleImage:${w.address}:${w.channelId}`)
        .setLabel(w.image ? '📷 ON' : '📷 OFF')
        .setStyle(ButtonStyle.Secondary),

      new ButtonBuilder()
        .setCustomId(`wallet:togglePin:${w.address}:${w.channelId}`)
        .setLabel(w.pin ? '📌 ON' : '📌 OFF')
        .setStyle(ButtonStyle.Secondary),
    ),
  );

  rows.push(
    new ActionRowBuilder<ButtonBuilder>().addComponents(
      ...FrequencyVO.all().map((freq) =>
        new ButtonBuilder()
          .setCustomId(`wallet:toggleSummary:${freq}:${w.address}:${w.channelId}`)
          .setLabel(
            `${freq.toLowerCase()} ${
              (freq === 'DAY' ? w.summaryDaily : freq === 'WEEK' ? w.summaryWeekly : w.summaryMonthly) ? '✅' : '❌'
            }`,
          )
          .setStyle(ButtonStyle.Primary),
      ),
    ),
  );

  // Tag / Clear
  rows.push(
    new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(`wallet:editTag:${w.address}:${w.channelId}`)
        .setLabel('🏷️ Tag')
        .setStyle(ButtonStyle.Primary),

      new ButtonBuilder()
        .setCustomId(`wallet:clearTag:${w.address}:${w.channelId}`)
        .setLabel('🚫 Clear Tag')
        .setStyle(ButtonStyle.Danger),
    ),
  );

  return rows;
}

export function buildWalletBackButton(customId: string): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(customId).setLabel('🔙 Back').setStyle(ButtonStyle.Secondary),
  );
}
