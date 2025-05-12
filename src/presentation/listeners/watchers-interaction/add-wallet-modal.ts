import type { ModalSubmitInteraction } from 'discord.js';
import { AddWalletWatchUseCase } from '../../../application/use-cases/add-wallet-watch.use-case';
import { DynamoWalletWatchRepository } from '../../../infrastructure/repositories/dynamo-wallet-watch-repository';
import { ListWalletWatchesUseCase } from '../../../application/use-cases/list-wallet-watches.use-case';
import {
  buildWalletsEmbed,
  buildWalletsComponents,
  buildWalletsBackComponent,
  buildWalletsAddComponent,
} from '../../utils/wallets-ui';

export async function handleAddWalletModal(interaction: ModalSubmitInteraction) {
  if (!interaction.customId.startsWith('watchers:addWalletModal:')) return;

  const channelId = interaction.customId.split(':')[2];
  const address = interaction.fields.getTextInputValue('walletAddressInput').trim();
  if (!interaction.guildId) return;

  const repo = new DynamoWalletWatchRepository();
  try {
    await new AddWalletWatchUseCase(repo).execute({
      guildId: interaction.guildId,
      address,
      channelId,
    });
  } catch {
  }

  await interaction.deferUpdate();

  const listUseCase = new ListWalletWatchesUseCase(repo);
  const watches = await listUseCase.execute({ guildId: interaction.guildId });
  const embed = buildWalletsEmbed(watches);
  const walletRows = buildWalletsComponents(watches);
  const addRow = buildWalletsAddComponent();
  const backRow = buildWalletsBackComponent('watchers:mainDashboard');

  await interaction.editReply({
    embeds: [embed],
    components: [...walletRows, addRow],
  });
}
