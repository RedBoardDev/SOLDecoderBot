import type { ButtonInteraction } from 'discord.js';
import { DynamoWalletWatchRepository } from '../../../../infrastructure/repositories/dynamo-wallet-watch-repository';
import { ListWalletWatchesUseCase } from '../../../../application/use-cases/list-wallet-watches.use-case';
import {
  buildSingleWalletEmbed,
  buildWalletDetailComponents,
  buildThresholdModal,
  buildWalletsBackComponent,
} from '../../../utils/wallets-ui';

export async function handleWalletButtons(interaction: ButtonInteraction) {
  const [ns, action, ...rest] = interaction.customId.split(':');
  if (ns !== 'wallet') return;

  const guildId = interaction.guildId;
  if (!guildId) return;

  const address = rest[rest.length - 1];
  const repo = new DynamoWalletWatchRepository();
  const watches = await new ListWalletWatchesUseCase(repo).execute({ guildId });
  const backRow = buildWalletsBackComponent('watchers:walletSettings');

  if (action === 'detail') {
    const target = watches.find((w) => w.address === address);
    if (!target) return;
    await interaction.update({
      embeds: [buildSingleWalletEmbed(target)],
      components: [...buildWalletDetailComponents(target), backRow],
    });
    return;
  }

  if (action === 'editThreshold') {
    await interaction.showModal(buildThresholdModal(address));
    return;
  }

  if (action === 'toggleImage') {
    const target = watches.find((w) => w.address === address);
    if (!target) return;
    const updated = target.toggleImage();
    await repo.save(updated);
    await interaction.deferUpdate();
    await interaction.editReply({
      embeds: [buildSingleWalletEmbed(updated)],
      components: [...buildWalletDetailComponents(updated), backRow],
    });
    return;
  }

  if (action === 'togglePin') {
    const target = watches.find((w) => w.address === address);
    if (!target) return;
    const updated = target.togglePin();
    await repo.save(updated);
    await interaction.deferUpdate();
    await interaction.editReply({
      embeds: [buildSingleWalletEmbed(updated)],
      components: [...buildWalletDetailComponents(updated), backRow],
    });
    return;
  }
}
