// src/infrastructure/services/summary-scheduler.ts
import { CronJob } from 'cron';
import { TextChannel, type Client } from 'discord.js';
import { DynamoWalletWatchRepository } from '../repositories/dynamo-wallet-watch-repository';
import { DynamoGuildSettingsRepository } from '../repositories/dynamo-guild-settings-repository';
import { TimezoneHelper, type Timezone } from '../../domain/value-objects/timezone';

export type SummaryFreq = 'DAY' | 'WEEK' | 'MONTH';

const DEFAULT_CRON: Record<SummaryFreq, string> = {
  DAY: '0 0 * * *', // chaque jour à 00:00
  WEEK: '0 0 * * 1', // chaque lundi à 00:00
  MONTH: '0 0 1 * *', // chaque 1er du mois à 00:00
};

export class SummaryScheduler {
  private static _instance: SummaryScheduler;
  private readonly walletRepo = new DynamoWalletWatchRepository();
  private readonly settingsRepo = new DynamoGuildSettingsRepository();
  private readonly jobs: CronJob[] = [];

  private constructor() {}

  /** Singleton */
  public static getInstance(): SummaryScheduler {
    if (!SummaryScheduler._instance) {
      SummaryScheduler._instance = new SummaryScheduler();
    }
    return SummaryScheduler._instance;
  }

  /**
   * Démarre tous les jobs cron pour chaque fréquence × chaque timezone connue.
   * @param client Client Discord
   * @param overrides Permet d’injecter d’autres expressions cron (tests, dev…)
   */
  public start(client: Client, overrides: Partial<Record<SummaryFreq, string>> = {}): void {
    const scheduleMap = { ...DEFAULT_CRON, ...overrides };

    for (const freq of Object.keys(scheduleMap) as SummaryFreq[]) {
      const cronExpr = scheduleMap[freq];
      for (const tz of TimezoneHelper.all()) {
        // CronJob(cronTime, onTick, onComplete?, start?, timeZone)
        const job = new CronJob(
          cronExpr,
          () => void this.run(freq, tz, client),
          null,
          true,
          tz,
        );
        this.jobs.push(job);
      }
    }

    console.log(`📅 SummaryScheduler démarré pour fréquences ${Object.keys(scheduleMap).join(', ')}`);
  }

  /** Stoppe tous les jobs programmés */
  public stopAll(): void {
    this.jobs.forEach((j) => j.stop());
    this.jobs.length = 0;
    console.log('🛑 SummaryScheduler stopped.');
  }

  /**
   * Méthode invoquée à chaque déclenchement cron.
   * - Charge tous les WalletWatch pour la fréquence donnée (GSI query)
   * - Pour chaque watch, récupère sa guild timezone (via settingsRepo.find)
   * - Si la timezone de la guild correspond à celle du job, envoie le résumé
   */
  private async run(freq: SummaryFreq, tz: Timezone, client: Client) {
    try {
      // 1) récupère toutes les paires guild+wallet qui ont summaryX=1
      const watches = await this.walletRepo.listBySummary(freq);

      if (watches.length === 0) return;
      // 2) pour chaque watch, on récupère la timezone de la guild
      await Promise.all(
        watches.map(async (w) => {
          // find renvoie null si pas de settings => on skip
          const settings = await this.settingsRepo.find(w.guildId);
          if (settings?.timezone !== tz) return;
          // envoi du résumé dans le channel
          const ch = await client.channels.fetch(w.channelId).catch(() => null);
          if (ch instanceof TextChannel) {
            await ch
              .send(
                `📝 **[${freq} Summary]**\n• **Wallet:** \`${w.address}\`\n• **Time zone:** ${tz}\n\n*Ceci est votre récapitulatif automatique.*`,
              )
              .catch((err) => console.error('Failed to send summary:', err));
          }
        }),
      );
    } catch (err) {
      console.error(`❌ SummaryScheduler error [${freq}@${tz}]:`, err);
    }
  }
}
