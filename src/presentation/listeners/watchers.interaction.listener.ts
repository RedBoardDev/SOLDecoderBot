import {
  type Client,
  type Interaction,
  type ButtonInteraction,
  type ModalSubmitInteraction,
  type MentionableSelectMenuInteraction,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  type ModalActionRowComponentBuilder,
  MentionableSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
} from 'discord.js';
import { DynamoWatcherRepository } from '../../infrastructure/repositories/dynamo-watcher-repository';
import { docClient } from '../../infrastructure/config/aws';
import { ListWatchersUseCase } from '../../application/use-cases/list-watchers.use-case';
import { Threshold } from '../../domain/value-objects/threshold';
import type { Watcher } from '../../domain/entities/watcher';
import { logger } from '../../shared/logger';
import { buildWatchersEmbed, buildWatchersComponents } from '../utils/watchers-ui';

export function registerWatchersInteractionHandlers(client: Client) {
  client.on('interactionCreate', async (interaction: Interaction) => {
    if (!interaction.isButton() && !interaction.isModalSubmit() && !interaction.isMentionableSelectMenu()) {
      return;
    }
    if (!interaction.guildId) return;

    const repo = new DynamoWatcherRepository(docClient);
    const listUseCase = new ListWatchersUseCase(repo);

    try {
      if (interaction.isButton()) {
        await handleButton(interaction, repo, listUseCase);
      } else if (interaction.isModalSubmit()) {
        await handleModalSubmit(interaction, repo, listUseCase);
      } else if (interaction.isMentionableSelectMenu()) {
        await handleSelectMenu(interaction, repo, listUseCase);
      }
    } catch (err: unknown) {
      logger.error('watchers interaction handler failed', err instanceof Error ? err : new Error(String(err)));
    }
  });
}

async function handleButton(
  interaction: ButtonInteraction,
  repo: DynamoWatcherRepository,
  listUseCase: ListWatchersUseCase,
) {
  const [action, channelId] = interaction.customId.split(':');

  if (action === 'editThreshold') {
    const modal = new ModalBuilder()
      .setCustomId(`modalThreshold:${channelId}`)
      .setTitle('Edit threshold (%)')
      .addComponents(
        new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(
          new TextInputBuilder()
            .setCustomId('thresholdInput')
            .setLabel('New value (0–100)')
            .setStyle(TextInputStyle.Short)
            .setRequired(true),
        ),
      );
    await interaction.showModal(modal);
    return;
  }

  if (action === 'editTag') {
    const watchers = await listUseCase.execute({ guildId: interaction.guildId });

    const selectMenu = new MentionableSelectMenuBuilder()
      .setCustomId(`selectTag:${channelId}`)
      .setPlaceholder('Select a user or a role')
      .setMinValues(1)
      .setMaxValues(1);

    const row1 = new ActionRowBuilder<MentionableSelectMenuBuilder>().addComponents(selectMenu);
    const clearBtn = new ButtonBuilder()
      .setCustomId(`clearTag:${channelId}`)
      .setLabel('🚫 Remove Tag')
      .setStyle(ButtonStyle.Danger);
    const row2 = new ActionRowBuilder<ButtonBuilder>().addComponents(clearBtn);

    await interaction.update({
      embeds: [buildWatchersEmbed(watchers)],
      components: [row1, row2],
    });
    return;
  }

  if (action === 'clearTag') {
    await interaction.deferUpdate();
    const watchers = await listUseCase.execute({ guildId: interaction.guildId });
    const target = watchers.find((w) => w.channelId === channelId);
    if (target) {
      const updated = target.clearTag();
      await repo.save(updated);
      const refreshed = await listUseCase.execute({ guildId: interaction.guildId });
      await interaction.editReply({
        embeds: [buildWatchersEmbed(refreshed)],
        components: buildWatchersComponents(refreshed),
      });
    }
    return;
  }

  if (action === 'toggleImage' || action === 'togglePin') {
    await interaction.deferUpdate();
    const watchers = await listUseCase.execute({ guildId: interaction.guildId });
    const target = watchers.find((w) => w.channelId === channelId);
    if (target) {
      const updated = action === 'toggleImage' ? target.toggleImage() : target.togglePin();
      await repo.save(updated);
      const refreshed = await listUseCase.execute({ guildId: interaction.guildId });
      await interaction.editReply({
        embeds: [buildWatchersEmbed(refreshed)],
        components: buildWatchersComponents(refreshed),
      });
    }
  }
}

async function handleModalSubmit(
  interaction: ModalSubmitInteraction,
  repo: DynamoWatcherRepository,
  listUseCase: ListWatchersUseCase,
) {
  const [modalType, channelId] = interaction.customId.split(':');
  await interaction.deferUpdate();

  const watchers = await listUseCase.execute({ guildId: interaction.guildId! });
  const target = watchers.find((w) => w.channelId === channelId);
  if (!target) return;

  let updated: Watcher = target;
  if (modalType === 'modalThreshold') {
    const input = interaction.fields.getTextInputValue('thresholdInput');
    const num = Number(input);
    updated = target.withThreshold(Threshold.create(num));
  }

  await repo.save(updated);
  const refreshed = await listUseCase.execute({ guildId: interaction.guildId! });
  await interaction.editReply({
    embeds: [buildWatchersEmbed(refreshed)],
    components: buildWatchersComponents(refreshed),
  });
}

async function handleSelectMenu(
  interaction: MentionableSelectMenuInteraction,
  repo: DynamoWatcherRepository,
  listUseCase: ListWatchersUseCase,
) {
  const [selectType, channelId] = interaction.customId.split(':');
  if (selectType !== 'selectTag') return;
  await interaction.deferUpdate();

  const id = interaction.values[0];
  const watchers = await listUseCase.execute({ guildId: interaction.guildId });
  const target = watchers.find((w) => w.channelId === channelId);
  if (!target) return;

  const guild = interaction.guild!;
  const type: 'USER' | 'ROLE' = guild.roles.cache.has(id) ? 'ROLE' : 'USER';
  const updated = target.withTag(id, type);

  await repo.save(updated);
  const refreshed = await listUseCase.execute({ guildId: interaction.guildId });
  await interaction.editReply({
    embeds: [buildWatchersEmbed(refreshed)],
    components: buildWatchersComponents(refreshed),
  });
}
