import type { ButtonInteraction } from 'discord.js';
import { DynamoWalletWatchRepository } from '../../../infrastructure/repositories/dynamo-wallet-watch-repository';
import { GetWalletWatchUseCase } from '../../../application/use-cases/get-wallet-watch.use-case';
import { NotFoundError } from '../../../application/errors/application-errors';
import { buildWalletBackButton, buildWalletDetailButtons } from '../../components/wallets/detail-buttons';
import { buildWalletDetailEmbed } from '../../components/wallets/embeds';

export async function handleViewWallet(interaction: ButtonInteraction) {
  const [ns, action, address, channelId] = interaction.customId.split(':');
  if (ns !== 'watchers' || action !== 'viewWallet') return;

  await interaction.deferUpdate();
  const guildId = interaction.guildId;
  if (!guildId) return;

  const repo = new DynamoWalletWatchRepository();
  const getUseCase = new GetWalletWatchUseCase(repo);

  try {
    const watch = await getUseCase.execute({ guildId, address, channelId });

    const embed = buildWalletDetailEmbed(watch);
    const detailRows = buildWalletDetailButtons(watch);
    const backRow = buildWalletBackButton('watchers:walletSettings');

    await interaction.editReply({
      embeds: [embed],
      components: [...detailRows, backRow],
    });
  } catch (err: unknown) {
    if (err instanceof NotFoundError) {
      await interaction.editReply({
        content: '❌ Wallet not found.',
        embeds: [],
        components: [],
      });
    } else {
      throw err;
    }
  }
}
