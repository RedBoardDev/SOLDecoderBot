// src/presentation/commands/scan.command.ts
import {
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
  PermissionFlagsBits,
  ChannelType,
  type TextChannel,
  type Message,
  type Collection,
} from 'discord.js';
import { DynamoWatcherRepository } from '../../infrastructure/repositories/dynamo-watcher-repository';
import { docClient } from '../../infrastructure/config/aws';
import { logger } from '../../shared/logger';
import { isCandidateMessage, extractMetlexLink, getPreviousMessage } from '../listeners/closed-message.listener';
import { fetchPositionData } from '../listeners/closed-message.fetch';
import { buildPositionMessage, buildTriggeredMessage } from '../utils/position-ui';
import { TakeProfitTriggerSchema } from '../../schemas/takeprofit-message.schema';
import { safePin } from '../utils/safe-pin';
import type { WatcherProps } from '../../domain/entities/watcher';

const MAX_BATCH = 10_000;
const MAX_RESULTS = 50;

/**
 * Scans the channel history for 🟨Closed messages and replays them.
 */
export const scanCommand = {
  data: new SlashCommandBuilder()
    .setName('scan')
    .setDescription('Retraite les derniers messages 🟨Closed du salon (jusqu’à 50 résultats, 10 000 max parcourus)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guildId || interaction.channel?.type !== ChannelType.GuildText) {
      await interaction.reply({
        content: 'Cette commande doit être utilisée dans un salon texte d’un serveur.',
        ephemeral: true,
      });
      return;
    }
    await interaction.deferReply({ ephemeral: true });

    const textChannel = interaction.channel as TextChannel;
    const watcher = await new DynamoWatcherRepository(docClient).findByGuildAndChannel(
      interaction.guildId,
      textChannel.id,
    );

    const results = await collectClosedMessages(textChannel);
    if (results.length === 0) {
      await interaction.editReply({ content: 'Aucun message 🟨Closed trouvé.' });
      return;
    }

    await interaction.editReply({ content: `Traitement de ${results.length} messages… Cela peut prendre du temps` });
    await processResults(results, textChannel, watcher);
    await interaction.followUp({ content: 'Scan terminé.', ephemeral: true });
  },
};

/** Collecte jusqu’à MAX_RESULTS occurrences de messages “🟨Closed”, en parcourant au plus MAX_BATCH messages. */
async function collectClosedMessages(channel: TextChannel): Promise<Array<{ msg: Message; prev: Message | null }>> {
  const out: Array<{ msg: Message; prev: Message | null }> = [];
  let lastId: string | undefined;
  let scanned = 0;

  while (scanned < MAX_BATCH && out.length < MAX_RESULTS) {
    const batch: Collection<string, Message> = await channel.messages.fetch({
      limit: 100,
      before: lastId,
    });
    if (batch.size === 0) break;
    for (const msg of batch.values()) {
      scanned++;
      if (isCandidateMessage(msg) && extractMetlexLink(msg.content)) {
        const prev = await getPreviousMessage(msg);
        out.push({ msg, prev });
        if (out.length >= MAX_RESULTS) break;
      }
      if (scanned >= MAX_BATCH) break;
    }
    lastId = batch.last()?.id;
  }
  return out;
}

/** Traite les résultats en ordre chronologique (plus anciens d’abord). */
async function processResults(
  results: Array<{ msg: Message; prev: Message | null }>,
  channel: TextChannel,
  watcher: WatcherProps | null,
) {
  for (const { msg, prev } of results.reverse()) {
    try {
      const metlex = extractMetlexLink(msg.content);
      if (!metlex) continue;
      const position = await fetchPositionData(metlex.hash);

      const trigger = prev ? TakeProfitTriggerSchema.safeParse(prev.content) : ({ success: false } as const);
      const body = trigger.success ? buildTriggeredMessage(position, trigger.data) : buildPositionMessage(position);

      const mention = watcher?.tagId
        ? watcher.tagType === 'USER'
          ? `<@${watcher.tagId}> `
          : `<@&${watcher.tagId}> `
        : '';
      const sent = await channel.send({ content: mention + body });
      if (watcher?.pin) await safePin(sent);
    } catch (err) {
      logger.warn('scan: erreur sur un message', {
        id: msg.id,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }
}
