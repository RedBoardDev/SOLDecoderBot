import {
  type ButtonInteraction,
  type MentionableSelectMenuInteraction,
  ActionRowBuilder,
  MentionableSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
} from 'discord.js';
import { DynamoWalletWatchRepository } from '../../../../infrastructure/repositories/dynamo-wallet-watch-repository';
import { GetWalletWatchUseCase } from '../../../../application/use-cases/get-wallet-watch.use-case';
import { buildWalletDetailButtons, buildWalletBackButton } from '../../../components/wallets/detail-buttons';
import type { IWalletWatchRepository } from '../../../../domain/interfaces/i-wallet-watch-repository';
import { buildWalletDetailEmbed } from '../../../components/wallets/embeds';

export async function handleTagButtons(interaction: ButtonInteraction) {
  const [ns, action, address, channelId] = interaction.customId.split(':');
  if (ns !== 'wallet' || action !== 'editTag') return;

  const guildId = interaction.guildId!;
  const repo: IWalletWatchRepository = new DynamoWalletWatchRepository();
  const watch = await new GetWalletWatchUseCase(repo).execute({ guildId, address, channelId });

  const select = new MentionableSelectMenuBuilder()
    .setCustomId(`wallet:selectTag:${address}:${channelId}`)
    .setPlaceholder('Select a user or a role')
    .setMinValues(1)
    .setMaxValues(1);

  const backRow = buildWalletBackButton('watchers:walletSettings');

  await interaction.update({
    embeds: [buildWalletDetailEmbed(watch)],
    components: [
      new ActionRowBuilder<MentionableSelectMenuBuilder>().addComponents(select),
      new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId(`wallet:clearTag:${address}:${channelId}`)
          .setLabel('🚫 Remove Tag')
          .setStyle(ButtonStyle.Danger),
      ),
      backRow,
    ],
  });
}

export async function handleTagSelect(interaction: MentionableSelectMenuInteraction) {
  if (!interaction.customId.startsWith('wallet:selectTag:')) return;
  const [, , address, channelId] = interaction.customId.split(':');
  const guildId = interaction.guildId!;

  const id = interaction.values[0];
  const repo: IWalletWatchRepository = new DynamoWalletWatchRepository();
  const watch = await new GetWalletWatchUseCase(repo).execute({ guildId, address, channelId });
  const type = interaction.guild!.roles.cache.has(id) ? 'ROLE' : 'USER';

  watch.setTag(id, type);
  const { guildId: g, address: a, channelId: c } = watch.getIdentifiers();
  await repo.patch({ guildId: g, address: a, channelId: c, tagId: id, tagType: type });

  const backRow = buildWalletBackButton('watchers:walletSettings');
  await interaction.update({
    embeds: [buildWalletDetailEmbed(watch)],
    components: [...buildWalletDetailButtons(watch), backRow],
  });
}

export async function handleTagButtonsClear(interaction: ButtonInteraction) {
  const [ns, action, address, channelId] = interaction.customId.split(':');
  if (ns !== 'wallet' || action !== 'clearTag') return;
  const guildId = interaction.guildId!;

  const repo: IWalletWatchRepository = new DynamoWalletWatchRepository();
  const watch = await new GetWalletWatchUseCase(repo).execute({ guildId, address, channelId });
  watch.clearTag();

  const { guildId: g, address: a, channelId: c } = watch.getIdentifiers();
  await repo.patch({ guildId: g, address: a, channelId: c, tagId: undefined, tagType: undefined });

  const backRow = buildWalletBackButton('watchers:walletSettings');
  await interaction.update({
    embeds: [buildWalletDetailEmbed(watch)],
    components: [...buildWalletDetailButtons(watch), backRow],
  });
}
