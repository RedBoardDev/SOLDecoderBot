import {
  MessageFlags,
  type ModalSubmitInteraction,
  ActionRowBuilder,
  TextInputBuilder,
  TextInputStyle,
  ModalBuilder,
} from 'discord.js';
import { DynamoWalletWatchRepository } from '../../../../infrastructure/repositories/dynamo-wallet-watch-repository';
import { GetWalletWatchUseCase } from '../../../../application/use-cases/get-wallet-watch.use-case';
import type { IWalletWatchRepository } from '../../../../domain/interfaces/i-wallet-watch-repository';
import { buildWalletBackButton, buildWalletDetailButtons } from '../../../components/wallets/detail-buttons';
import { buildWalletDetailEmbed } from '../../../components/wallets/embeds';
import { logger } from '../../../../shared/logger';

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

export async function handleThresholdModal(interaction: ModalSubmitInteraction) {
  if (!interaction.customId.startsWith('wallet:thresholdModal:')) return;

  const [ns, modal, address, channelId] = interaction.customId.split(':');
  if (!address || !channelId) {
    logger.warn('Invalid modal customId, missing address or channelId', { customId: interaction.customId });
    return;
  }

  const raw = interaction.fields.getTextInputValue('thresholdInput').trim();
  const backRow = buildWalletBackButton('watchers:walletSettings');

  const twoDecimalRegex = /^\d{1,3}(?:\.\d{1,2})?$/;
  if (!twoDecimalRegex.test(raw)) {
    await interaction.reply({
      content: '❌ Invalid format. Please provide a number with up to 2 decimal places.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }
  const parsed = Number.parseFloat(raw);
  if (Number.isNaN(parsed) || parsed < 0.01 || parsed > 100) {
    await interaction.reply({
      content: '❌ Value out of bounds. Please provide a number between 0.01 and 100.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  await interaction.deferUpdate();
  const guildId = interaction.guildId!;
  const repo: IWalletWatchRepository = new DynamoWalletWatchRepository();

  const watch = await new GetWalletWatchUseCase(repo).execute({ guildId, address, channelId });

  watch.setThreshold(parsed);
  await repo.patch({ guildId, address, channelId, threshold: parsed });

  await interaction.editReply({
    embeds: [buildWalletDetailEmbed(watch)],
    components: [...buildWalletDetailButtons(watch), backRow],
  });
}
