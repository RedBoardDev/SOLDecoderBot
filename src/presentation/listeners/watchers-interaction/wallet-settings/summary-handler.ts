import type { ButtonInteraction } from 'discord.js';
import { DynamoWalletWatchRepository } from '../../../../infrastructure/repositories/dynamo-wallet-watch-repository';
import { ListWalletWatchesUseCase } from '../../../../application/use-cases/list-wallet-watches.use-case';
import { buildSingleWalletEmbed, buildWalletDetailComponents, buildWalletsBackComponent } from '../../../utils/wallets-ui';
import { FrequencyVO } from '../../../../domain/value-objects/frequency';

export async function handleSummaryToggle(interaction: ButtonInteraction) {
  const [ns, action, freq, address] = interaction.customId.split(':');
  if (ns !== 'wallet' || action !== 'toggleSummary') return;

  const guildId = interaction.guildId;
  if (!guildId) return;

  await interaction.deferUpdate();

  const repo = new DynamoWalletWatchRepository();
  const watches = await new ListWalletWatchesUseCase(repo).execute({ guildId });
  const backRow = buildWalletsBackComponent('watchers:walletSettings');

  const target = watches.find((w) => w.address === address);
  if (!target) return;

  const frequency = FrequencyVO.create(freq).raw;
  const enabled =
    frequency === 'DAY' ? !target.summaryDaily : frequency === 'WEEK' ? !target.summaryWeekly : !target.summaryMonthly;

  const updated = target.withSummary(frequency, enabled);
  await repo.save(updated);

  await interaction.editReply({
    embeds: [buildSingleWalletEmbed(updated)],
    components: [...buildWalletDetailComponents(updated), backRow],
  });
}
