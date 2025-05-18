import { CronJob } from 'cron';
import type { Client } from 'discord.js';
import { DynamoWalletWatchRepository } from '../repositories/dynamo-wallet-watch-repository';
import { DynamoGuildSettingsRepository } from '../repositories/dynamo-guild-settings-repository';
import { type Timezone, TimezoneHelper } from '../../domain/value-objects/timezone';
import type { WalletWatch } from '../../domain/entities/wallet-watch';
import { buildSummaryEmbed } from '../../presentation/ui/summary/summary-ui';
import { buildSummaryImage, type SummaryData } from '../../presentation/ui/summary/build-summary-image';
import { LpAgentService } from './lpagent-service';
import { logger } from '../../shared/logger';
import type { Frequency } from '../../domain/value-objects/frequency';

const DEFAULT_CRON: Record<Frequency, string> = {
  DAY: '0 0 * * *',
  WEEK: '0 0 * * 1',
  MONTH: '0 0 1 * *',
};

export class SummaryScheduler {
  private static _instance: SummaryScheduler;
  private readonly walletRepo = new DynamoWalletWatchRepository();
  private readonly settingsRepo = new DynamoGuildSettingsRepository();
  private readonly lpClient = LpAgentService.getInstance();
  private readonly jobs: CronJob[] = [];

  private constructor() {}

  public static getInstance(): SummaryScheduler {
    if (!SummaryScheduler._instance) {
      SummaryScheduler._instance = new SummaryScheduler();
    }
    return SummaryScheduler._instance;
  }

  public start(client: Client, overrides: Partial<Record<Frequency, string>> = {}): void {
    const scheduleMap = { ...DEFAULT_CRON, ...overrides };
    for (const freq of Object.keys(scheduleMap) as Frequency[]) {
      const expr = scheduleMap[freq];
      for (const tz of TimezoneHelper.all()) {
        const job = new CronJob(expr, () => void this.run(freq, tz, client), null, true, tz);
        this.jobs.push(job);
      }
    }
  }

  public stopAll(): void {
    this.jobs.forEach((j) => j.stop());
    this.jobs.length = 0;
  }

  public async run(freq: Frequency, tz: Timezone, client: Client) {
    // TODO mettre en privée
    try {
      const watches = await this.walletRepo.listBySummary(freq);
      if (!watches.length) return;

      await Promise.all(
        watches.map(async (w: WalletWatch) => {
          const settings = await this.settingsRepo.find(w.guildId);
          if (settings?.timezone !== tz) return;
          await this.sendSummary(freq, w, tz, client);
        }),
      );
    } catch (err) {
      logger.error('Error in SummaryScheduler', err instanceof Error ? err : new Error(String(err)));
    }
  }

  private async sendSummary(freq: Frequency, watch: WalletWatch, tz: Timezone, client: Client): Promise<void> {
    const { startUtc, endUtc } = this.lpClient.computeRange(freq, tz);

    const positions = await this.lpClient.fetchRange(watch.address, startUtc, endUtc);

    const totalPct = positions.reduce((sum, p) => sum + p.percent, 0);
    const totalSol = positions.reduce((sum, p) => sum + p.pnlSol, 0);
    const totalUsd = positions.reduce((sum, p) => sum + p.pnlUsd, 0);
    const totalVolSol = positions.reduce((sum, p) => sum + Math.abs(p.pnlSol), 0);
    const totalVolUsd = positions.reduce((sum, p) => sum + Math.abs(p.pnlUsd), 0);

    const embed = buildSummaryEmbed(freq, watch.address, tz, positions, startUtc, endUtc) // TODO du coup utiliser les valeurs deja calculer.. et faire ça dans une autre fonction plutot
      .setImage('attachment://summary.png');

    const fmtDate = (d: Date) => d.toLocaleDateString('en-US');
    const periodLabel = `${fmtDate(startUtc)} – ${fmtDate(endUtc)}`;

    const imgData: SummaryData = {
      periodLabel,
      winRatePct: totalPct,
      totalVolumeSol: totalVolSol,
      totalVolumeUsd: totalVolUsd,
      totalPnlSol: totalSol,
      totalPnlUsd: totalUsd,
    };

    const imageBuffer = await buildSummaryImage(imgData);

    const ch = await client.channels.fetch(watch.channelId).catch(() => null);
    if (ch?.isSendable()) {
      await ch.send({
        embeds: [embed],
        files: [{ attachment: imageBuffer, name: 'summary.png' }],
      });
    }
  }
}
