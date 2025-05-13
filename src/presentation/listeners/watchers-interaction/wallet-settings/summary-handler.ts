import type { ButtonInteraction } from 'discord.js';
import { DynamoWalletWatchRepository } from '../../../../infrastructure/repositories/dynamo-wallet-watch-repository';
import { GetWalletWatchUseCase } from '../../../../application/use-cases/get-wallet-watch.use-case';
import type { IWalletWatchRepository } from '../../../../domain/interfaces/i-wallet-watch-repository';
import { FrequencyVO } from '../../../../domain/value-objects/frequency';
import type { WalletWatch } from '../../../../domain/entities/wallet-watch';
import { buildWalletBackButton, buildWalletDetailButtons } from '../../../components/wallets/detail-buttons';
import { buildWalletDetailEmbed } from '../../../components/wallets/embeds';

export async function handleSummaryToggle(interaction: ButtonInteraction) {
  const [ns, action, freq, address, channelId] = interaction.customId.split(':');
  if (ns !== 'wallet' || action !== 'toggleSummary') return;

  await interaction.deferUpdate();
  const guildId = interaction.guildId!;
  const repo: IWalletWatchRepository = new DynamoWalletWatchRepository();
  const watch = await new GetWalletWatchUseCase(repo).execute({ guildId, address, channelId });

  const backRow = buildWalletBackButton('watchers:walletSettings');
  const frequency = FrequencyVO.create(freq).raw;

  const current =
    frequency === 'DAY' ? watch.summaryDaily : frequency === 'WEEK' ? watch.summaryWeekly : watch.summaryMonthly;

  const newVal = (watch as WalletWatch).setSummary(frequency, !current) ? 1 : 0;
  const { guildId: g, address: a, channelId: c } = watch.getIdentifiers();
  const field = frequency === 'DAY' ? 'summaryDaily' : frequency === 'WEEK' ? 'summaryWeekly' : 'summaryMonthly';

  await repo.patch({ guildId: g, address: a, channelId: c, [field]: newVal } as any);

  await interaction.editReply({
    embeds: [buildWalletDetailEmbed(watch)],
    components: [...buildWalletDetailButtons(watch), backRow],
  });
}
