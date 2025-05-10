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
import { isCandidateMessage, getPreviousMessage, extractMetlexLinks } from '../listeners/closed-message.listener';
import { buildPositionMessage, buildTriggeredMessage } from '../utils/position-ui';
import { TakeProfitTriggerSchema } from '../../schemas/takeprofit-message.schema';
import { safePin } from '../utils/safe-pin';

import { PositionFetcher } from '../../infrastructure/services/position-fetcher';
import type { WatcherProps } from '../../domain/entities/watcher';
import type { MetlexLinks } from '../../schemas/metlex-link.schema';
import { aggregatePositions } from '../utils/aggregate-positions';

const MAX_BATCH = 10_000;
const MAX_RESULTS = 50;

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

    const channel = interaction.channel as TextChannel;
    const watcher = await new DynamoWatcherRepository(docClient).findByGuildAndChannel(interaction.guildId, channel.id);

    const results = await collectClosedMessages(channel);
    if (results.length === 0) {
      await interaction.editReply({ content: 'Aucun message 🟨Closed trouvé.' });
      return;
    }

    await interaction.editReply({ content: `Traitement de ${results.length} messages… Cela peut prendre du temps.` });
    await processResults(results, channel, watcher);
    await interaction.followUp({ content: 'Scan terminé.', ephemeral: true });
  },
};

interface ClosedResult {
  msg: Message;
  prev: Message | null;
  links: MetlexLinks;
}

async function collectClosedMessages(channel: TextChannel): Promise<ClosedResult[]> {
  const out: ClosedResult[] = [];
  let lastId: string | undefined;
  let scanned = 0;

  while (scanned < MAX_BATCH && out.length < MAX_RESULTS) {
    const batch: Collection<string, Message> = await channel.messages.fetch({ limit: 100, before: lastId });
    if (batch.size === 0) break;

    for (const msg of batch.values()) {
      scanned++;
      if (isCandidateMessage(msg)) {
        const links = extractMetlexLinks(msg.content);
        if (links && links.length > 0) {
          const prev = await getPreviousMessage(msg);
          out.push({ msg, prev, links });
          if (out.length >= MAX_RESULTS) break;
        }
      }
      if (scanned >= MAX_BATCH) break;
    }

    lastId = batch.last()?.id;
  }

  return out;
}

async function processResults(results: ClosedResult[], channel: TextChannel, watcher: WatcherProps | null) {
  const fetcher = PositionFetcher.getInstance();

  for (const { msg, prev, links } of results.reverse()) {
    try {
      const positions = await fetcher.fetchPositions(links);

      const aggregated = aggregatePositions(positions);

      const trigger = prev ? TakeProfitTriggerSchema.safeParse(prev.content) : ({ success: false } as const);

      const body = trigger.success ? buildTriggeredMessage(aggregated, trigger.data) : buildPositionMessage(aggregated);

      const mention = watcher?.tagId
        ? watcher.tagType === 'USER'
          ? `<@${watcher.tagId}> `
          : `<@&${watcher.tagId}> `
        : '';

      const sent = await channel.send({ content: mention + body });
      if (watcher?.pin) {
        await safePin(sent);
      }
    } catch (err) {
      logger.warn('scan: erreur sur un message', {
        id: msg.id,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }
}
