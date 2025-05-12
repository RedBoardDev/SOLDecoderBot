import { MessageFlags, type ModalSubmitInteraction } from 'discord.js';
import { Threshold } from '../../../../domain/value-objects/threshold';
import { DynamoWalletWatchRepository } from '../../../../infrastructure/repositories/dynamo-wallet-watch-repository';
import { ListWalletWatchesUseCase } from '../../../../application/use-cases/list-wallet-watches.use-case';
import {
  buildSingleWalletEmbed,
  buildWalletDetailComponents,
  buildWalletsBackComponent,
} from '../../../utils/wallets-ui';

export async function handleThresholdModal(interaction: ModalSubmitInteraction) {
  if (!interaction.customId.startsWith('wallet:thresholdModal:')) return;

  const address = interaction.customId.split(':')[2];
  const raw = interaction.fields.getTextInputValue('thresholdInput').trim();
  const backRow = buildWalletsBackComponent('watchers:walletSettings');

  const twoDecimalRegex = /^\d{1,3}(?:\.\d{1,2})?$/;
  if (!twoDecimalRegex.test(raw)) {
    await interaction.reply({
      content:
        '❌ Invalid format. Please enter a number between 0.01 and 100 with up to two decimal places (e.g., 1.23).',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const value = Number.parseFloat(raw);
  if (Number.isNaN(value) || value < 0.01 || value > 100) {
    await interaction.reply({
      content: '❌ Value out of bounds. Must be ≥ 0.01 and ≤ 100.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const threshold = Threshold.create(value);

  await interaction.deferUpdate();

  const guildId = interaction.guildId;
  if (!guildId) return;

  const repo = new DynamoWalletWatchRepository();
  const watches = await new ListWalletWatchesUseCase(repo).execute({ guildId });
  const target = watches.find((w) => w.address === address);
  if (!target) return;

  const updated = target.withThreshold(threshold);
  await repo.save(updated);

  await interaction.editReply({
    embeds: [buildSingleWalletEmbed(updated)],
    components: [...buildWalletDetailComponents(updated), backRow],
  });
}
