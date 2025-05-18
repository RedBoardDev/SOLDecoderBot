import type { ButtonInteraction } from 'discord.js';
import { DynamoWalletWatchRepository } from '../../../../infrastructure/repositories/dynamo-wallet-watch-repository';
import { GetWalletWatchUseCase } from '../../../../application/use-cases/get-wallet-watch.use-case';
import type { IWalletWatchRepository } from '../../../../domain/interfaces/i-wallet-watch-repository';
import { buildThresholdModal } from '../../../components/wallets/modals';
import { buildWalletBackButton, buildWalletDetailButtons } from '../../../components/wallets/detail-buttons';
import { buildWalletDetailEmbed } from '../../../components/wallets/embeds';

export async function handleWalletButtons(interaction: ButtonInteraction) {
  const [ns, action, address, channelId] = interaction.customId.split(':');
  if (ns !== 'wallet') return;

  const guildId = interaction.guildId;
  if (!guildId) return;

  if (action === 'detail') {
    const repo: IWalletWatchRepository = new DynamoWalletWatchRepository();
    const watch = await new GetWalletWatchUseCase(repo).execute({ guildId, address, channelId });
    const backRow = buildWalletBackButton('watchers:walletSettings');
    await interaction.update({
      embeds: [buildWalletDetailEmbed(watch)],
      components: [...buildWalletDetailButtons(watch), backRow],
    });
    return;
  }

  if (action === 'editThreshold') {
    await interaction.showModal(buildThresholdModal(address, channelId));
    return;
  }

  if (action === 'toggleImage' || action === 'togglePin') {
    const repo: IWalletWatchRepository = new DynamoWalletWatchRepository();
    const getUseCase = new GetWalletWatchUseCase(repo);

    const watch = await getUseCase.execute({ guildId, address, channelId });
    const backRow = buildWalletBackButton('watchers:walletSettings');
    const { guildId: g, address: a, channelId: c } = watch.getIdentifiers();

    if (action === 'toggleImage') {
      const newImage = watch.toggleImage();
      await repo.patch({ guildId: g, address: a, channelId: c, image: newImage ? 1 : 0 });
    } else {
      const newPin = watch.togglePin();
      await repo.patch({ guildId: g, address: a, channelId: c, pin: newPin ? 1 : 0 });
    }

    await interaction.deferUpdate();
    await interaction.editReply({
      embeds: [buildWalletDetailEmbed(watch)],
      components: [...buildWalletDetailButtons(watch), backRow],
    });
    return;
  }
}
