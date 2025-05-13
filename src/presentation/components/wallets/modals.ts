import { ModalBuilder, ActionRowBuilder, TextInputBuilder, TextInputStyle } from 'discord.js';

export function buildThresholdModal(address: string, channelId: string): ModalBuilder {
  return new ModalBuilder()
    .setCustomId(`wallet:thresholdModal:${address}:${channelId}`)
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
