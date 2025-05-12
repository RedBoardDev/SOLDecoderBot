import {
  type ButtonInteraction,
  type MentionableSelectMenuInteraction,
  ActionRowBuilder,
  MentionableSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
} from 'discord.js';
import { DynamoWalletWatchRepository } from '../../../../infrastructure/repositories/dynamo-wallet-watch-repository';
import { ListWalletWatchesUseCase } from '../../../../application/use-cases/list-wallet-watches.use-case';
import {
  buildSingleWalletEmbed,
  buildWalletDetailComponents,
  buildWalletsBackComponent,
} from '../../../utils/wallets-ui';

export async function handleTagButtons(interaction: ButtonInteraction) {
  const [ns, action, address] = interaction.customId.split(':');
  if (ns !== 'wallet' || action !== 'editTag') return;

  const guildId = interaction.guildId;
  if (!guildId) return;

  const repo = new DynamoWalletWatchRepository();
  const watches = await new ListWalletWatchesUseCase(repo).execute({ guildId });

  const select = new MentionableSelectMenuBuilder()
    .setCustomId(`wallet:selectTag:${address}`)
    .setPlaceholder('Select a user or a role')
    .setMinValues(1)
    .setMaxValues(1);

  const row1 = new ActionRowBuilder<MentionableSelectMenuBuilder>().addComponents(select);
  const row2 = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`wallet:clearTag:${address}`)
      .setLabel('🚫 Remove Tag')
      .setStyle(ButtonStyle.Danger),
  );

  const target = watches.find((w) => w.address === address);
  if (!target) return;

  await interaction.update({
    embeds: [buildSingleWalletEmbed(target)],
    components: [row1, row2],
  });
}

export async function handleTagSelect(interaction: MentionableSelectMenuInteraction) {
  if (!interaction.customId.startsWith('wallet:selectTag:')) return;

  const guildId = interaction.guildId;
  if (!guildId) return;

  await interaction.deferUpdate();

  const address = interaction.customId.split(':')[2];
  const id = interaction.values[0];
  const repo = new DynamoWalletWatchRepository();
  const watches = await new ListWalletWatchesUseCase(repo).execute({ guildId });
  const backRow = buildWalletsBackComponent('watchers:walletSettings');

  const target = watches.find((w) => w.address === address);
  if (!target) return;

  const guild = interaction.guild;
  if (!guild) return;
  const type = guild.roles.cache.has(id) ? 'ROLE' : 'USER';
  const updated = target.withTag(id, type);

  await repo.save(updated);
  await interaction.editReply({
    embeds: [buildSingleWalletEmbed(updated)],
    components: [...buildWalletDetailComponents(updated), backRow],
  });
}

export async function handleTagButtonsClear(interaction: ButtonInteraction) {
  const [ns, action, address] = interaction.customId.split(':');
  if (ns !== 'wallet' || action !== 'clearTag') return;

  const guildId = interaction.guildId;
  if (!guildId) return;

  await interaction.deferUpdate();

  const repo = new DynamoWalletWatchRepository();
  const watches = await new ListWalletWatchesUseCase(repo).execute({ guildId });
  const backRow = buildWalletsBackComponent('watchers:walletSettings');

  const target = watches.find((w) => w.address === address);
  if (!target) return;

  const updated = target.clearTag();
  await repo.save(updated);

  await interaction.editReply({
    embeds: [buildSingleWalletEmbed(updated)],
    components: [...buildWalletDetailComponents(updated), backRow],
  });
}
