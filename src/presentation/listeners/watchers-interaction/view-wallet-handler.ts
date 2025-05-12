import type { ButtonInteraction } from 'discord.js';
import { DynamoWalletWatchRepository } from '../../../infrastructure/repositories/dynamo-wallet-watch-repository';
import { buildSingleWalletEmbed, buildWalletDetailComponents, buildWalletsBackComponent } from '../../utils/wallets-ui';
import { ListWalletWatchesUseCase } from '../../../application/use-cases/list-wallet-watches.use-case';

export async function handleViewWallet(interaction: ButtonInteraction) {
  const [ns, action, address, channelId] = interaction.customId.split(':');
  if (ns !== 'watchers' || action !== 'viewWallet') return;

  await interaction.deferUpdate();
  const guildId = interaction.guildId;
  if (!guildId) return;

  const repo = new DynamoWalletWatchRepository();
  const watches = await new ListWalletWatchesUseCase(repo).execute({ guildId });
  const watch = watches.find((w) => w.address === address && w.channelId === channelId);
  if (!watch) {
    return interaction.editReply({ content: '❌ Wallet not found.', embeds: [], components: [] });
  }

  const embed = buildSingleWalletEmbed(watch);
  const detailRows = buildWalletDetailComponents(watch);
  const backRow = buildWalletsBackComponent('watchers:walletSettings');

  await interaction.editReply({
    embeds: [embed],
    components: [...detailRows, backRow],
  });
}
