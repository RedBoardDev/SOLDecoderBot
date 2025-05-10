import { SlashCommandBuilder, type ChatInputCommandInteraction, PermissionFlagsBits, MessageFlags } from 'discord.js';
import { UserError } from '../../application/errors/application-errors';
import { buildPositionImage } from '../utils/position-ui';
import { logger } from '../../shared/logger';
import { PositionFetcher } from '../../infrastructure/services/position-fetcher';

export const cardCommand = {
  data: new SlashCommandBuilder()
    .setName('card')
    .setDescription('Génère une carte PnL à partir d’un hash')
    .addStringOption((opt) =>
      opt.setName('hash').setDescription('Hash extrait de l’URL (p. ex. 3iCfTA…KgFhBC)').setRequired(true),
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    try {
      const hash = interaction.options.getString('hash', true).trim();
      if (!/^[A-Za-z0-9-]+$/.test(hash)) {
        throw new UserError('Hash invalide : seul alphanumérique et tirets autorisés.');
      }

      const fetcher = PositionFetcher.getInstance();
      const position = await fetcher.fetchPosition(hash);

      const image = await buildPositionImage(position, false);

      await interaction.editReply({
        files: [{ attachment: image, name: `position-${position.data.tokenId}.png` }],
      });
    } catch (err: unknown) {
      if (err instanceof UserError) {
        await interaction.editReply({ content: `❌ ${err.message}` });
      } else {
        logger.error('cardCommand failed', err instanceof Error ? err : new Error(String(err)));
        await interaction.editReply({
          content: '❌ Une erreur est survenue, veuillez réessayer plus tard.',
        });
      }
    }
  },
};
