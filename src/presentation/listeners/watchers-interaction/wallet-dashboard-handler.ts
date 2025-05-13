import {
  ActionRowBuilder,
  ChannelSelectMenuBuilder,
  ChannelType,
  MessageFlags,
  type ButtonInteraction,
} from 'discord.js';
import { DynamoWalletWatchRepository } from '../../../infrastructure/repositories/dynamo-wallet-watch-repository';
import type { IWalletWatchRepository } from '../../../domain/interfaces/i-wallet-watch-repository';
import { ListWalletFromGuildUseCase } from '../../../application/use-cases/list-wallets-from-guild.use-case';
import { RemoveWalletWatchUseCase } from '../../../application/use-cases/remove-wallet-watch.use-case';
import { buildWalletsListEmbed } from '../../components/wallets/embeds';
import { buildWalletsAddButton, buildWalletsListButtons } from '../../components/wallets/list-buttons';

export async function handleWalletDashboard(interaction: ButtonInteraction) {
  const [ns, action, address, channelId] = interaction.customId.split(':');
  if (ns !== 'watchers') return;

  const repo: IWalletWatchRepository = new DynamoWalletWatchRepository();
  const listUseCase = new ListWalletFromGuildUseCase(repo);

  if (action === 'addWallet') {
    const watches = await listUseCase.execute({ guildId: interaction.guildId! });
    if (watches.length >= 4) {
      await interaction.reply({
        content: '❌ You can only add up to **4** wallet–channel pairings.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }
    await interaction.deferUpdate();
    const channelSelectRow = new ActionRowBuilder<ChannelSelectMenuBuilder>().addComponents(
      new ChannelSelectMenuBuilder()
        .setCustomId('watchers:selectChannel')
        .setPlaceholder('Choose a channel for this wallet')
        .setChannelTypes(ChannelType.GuildText),
    );
    await interaction.editReply({
      content: 'In which channel should I post updates for this wallet?',
      embeds: [],
      components: [channelSelectRow],
    });
    return;
  }

  if (action === 'walletSettings') {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  } else if (action === 'toggleNotify' || action === 'deleteWallet') {
    await interaction.deferUpdate();
  } else {
    return;
  }

  let watches = await listUseCase.execute({ guildId: interaction.guildId! });

  if (action === 'toggleNotify') {
    const target = watches.find((w) => w.address === address && w.channelId === channelId);
    if (target) {
      const newNotify = target.notifyOnClose ? 0 : 1;
      await repo.patch({ guildId: interaction.guildId!, address, channelId, notifyOnClose: newNotify });
      watches = await listUseCase.execute({ guildId: interaction.guildId! });
    }
  }

  if (action === 'deleteWallet') {
    await new RemoveWalletWatchUseCase(repo).execute({ guildId: interaction.guildId!, address, channelId });
    watches = await listUseCase.execute({ guildId: interaction.guildId! });
  }

  const embed = buildWalletsListEmbed(watches);
  const walletRows = buildWalletsListButtons(watches);
  const addRow = buildWalletsAddButton();

  await interaction.editReply({
    embeds: [embed],
    components: [...walletRows, addRow],
  });
}
