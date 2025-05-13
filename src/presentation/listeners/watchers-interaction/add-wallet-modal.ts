import type { ModalSubmitInteraction } from 'discord.js';
import { AddWalletWatchUseCase } from '../../../application/use-cases/add-wallet-watch.use-case';
import { DynamoWalletWatchRepository } from '../../../infrastructure/repositories/dynamo-wallet-watch-repository';
import { ListWalletFromGuildUseCase } from '../../../application/use-cases/list-wallets-from-guild.use-case';
import { buildWalletBackButton } from '../../components/wallets/detail-buttons';
import { buildWalletsListEmbed } from '../../components/wallets/embeds';
import { buildWalletsAddButton, buildWalletsListButtons } from '../../components/wallets/list-buttons';

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

  const listUseCase = new ListWalletFromGuildUseCase(repo);
  const watches = await listUseCase.execute({ guildId: interaction.guildId });
  const embed = buildWalletsListEmbed(watches);
  const walletRows = buildWalletsListButtons(watches);
  const addRow = buildWalletsAddButton();
  const backRow = buildWalletBackButton('watchers:mainDashboard');

  await interaction.editReply({
    embeds: [embed],
    components: [...walletRows, addRow, backRow],
  });
}
