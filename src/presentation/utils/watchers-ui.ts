import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import type { Watcher } from '../../domain/entities/watcher';

/**
 * Builds an embed displaying the list of watchers.
 * @param watchers Array of Watcher entities.
 * @returns Configured EmbedBuilder instance.
 */
export function buildWatchersEmbed(watchers: Watcher[]): EmbedBuilder {
  const embed = new EmbedBuilder().setTitle(`Watchers (${watchers.length})`).setColor(0x00ae86);

  watchers.forEach((w, idx) => {
    const num = idx + 1;
    const tag =
      w.tagId && w.tagType === 'USER' ? `<@${w.tagId}>` : w.tagId && w.tagType === 'ROLE' ? `<@&${w.tagId}>` : 'none';
    embed.addFields({
      name: `**${num}. Channel:** <#${w.channelId}>`,
      value: [
        `• **Threshold:** ±${w.threshold.value}%`,
        `• **Image:** ${w.image ? 'Yes' : 'No'}`,
        `• **Pin:** ${w.pin ? 'Yes' : 'No'}`,
        `• **Tag:** ${tag}`,
      ].join('\n'),
    });
  });

  return embed;
}

/**
 * Builds action rows with buttons for each watcher.
 * @param watchers Array of Watcher entities.
 * @returns Array of ActionRowBuilder<ButtonBuilder> instances.
 */
export function buildWatchersComponents(watchers: Watcher[]): ActionRowBuilder<ButtonBuilder>[] {
  return watchers.map((w) =>
    new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId(`editThreshold:${w.channelId}`).setLabel('⚙️ Threshold').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId(`editTag:${w.channelId}`).setLabel('🏷 Tag').setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId(`toggleImage:${w.channelId}`)
        .setLabel(w.image ? '📷 Yes' : '📷 No')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(`togglePin:${w.channelId}`)
        .setLabel(w.pin ? '📌 Yes' : '📌 No')
        .setStyle(ButtonStyle.Secondary),
    ),
  );
}
