import { logger } from '@shared/logger.js';
import {
  createWalletSynchronizationService,
  type WalletSynchronizationService,
} from './wallet-synchronization-service.js';
import { config } from '../config/env.js';

export class AutoRefreshScheduler {
  private isRunning = false;
  private intervalId?: NodeJS.Timeout;
  private readonly REFRESH_INTERVAL = config.AUTO_REFRESH_INTERVAL;
  private readonly STARTUP_DELAY = config.AUTO_REFRESH_STARTUP_DELAY;

  constructor(private walletSyncService: WalletSynchronizationService) {}

  public start(): void {
    if (this.isRunning) {
      logger.warn('AutoRefreshScheduler is already running');
      return;
    }

    this.isRunning = true;
    const intervalMinutes = this.REFRESH_INTERVAL / (60 * 1000);
    const startupDelaySeconds = this.STARTUP_DELAY / 1000;
    logger.info(
      `Starting AutoRefreshScheduler with ${intervalMinutes}-minute interval (startup delay: ${startupDelaySeconds}s)`,
    );

    // Démarrer immédiatement après le délai configuré
    setTimeout(() => {
      this.runRefreshCycle();
    }, this.STARTUP_DELAY);

    // Puis répéter selon l'intervalle configuré
    this.intervalId = setInterval(() => {
      this.runRefreshCycle();
    }, this.REFRESH_INTERVAL);
  }

  public stop(): void {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }
    logger.info('AutoRefreshScheduler stopped');
  }

  private async runRefreshCycle(): Promise<void> {
    logger.info('Starting optimized auto-refresh cycle');

    try {
      // Use the optimized wallet synchronization service
      const syncSummary = await this.walletSyncService.syncAllWallets({
        batchSize: 5, // Process in batches to avoid overwhelming services
        delayBetweenBatches: 100, // Small delay between batches
      });

      if (syncSummary.totalWallets === 0) {
        logger.info('No wallets to refresh');
        return;
      }

      // Log comprehensive results
      logger.info(
        `Auto-refresh cycle completed: ${syncSummary.successfulSyncs}/${syncSummary.totalWallets} successful, ${syncSummary.newTransactionsFound} new transactions found, ${syncSummary.failedSyncs} failures (${(syncSummary.totalProcessingTime / 1000).toFixed(2)}s)`,
      );

      // Log individual failures if any
      if (syncSummary.failedSyncs > 0) {
        const failedWallets = syncSummary.results
          .filter((result) => result.error)
          .map((result) => `${result.walletAddress}: ${result.error}`)
          .slice(0, 5); // Limit to first 5 failures to avoid log spam

        logger.warn(
          `Failed wallets in this cycle: ${failedWallets.join(', ')}${syncSummary.failedSyncs > 5 ? ` and ${syncSummary.failedSyncs - 5} more...` : ''}`,
        );
      }

      // Log sync statistics for monitoring
      const stats = await this.walletSyncService.getSyncStatistics();
      logger.debug(
        `Sync statistics: ${stats.totalRegisteredWallets} registered wallets, avg ${stats.averageTransactionsPerWallet.toFixed(2)} transactions per wallet`,
      );
    } catch (error) {
      logger.error('Error during optimized auto-refresh cycle:', error);
    }
  }

  public getStatus(): { isRunning: boolean; nextRefresh?: Date } {
    return {
      isRunning: this.isRunning,
      nextRefresh: this.intervalId ? new Date(Date.now() + this.REFRESH_INTERVAL) : undefined,
    };
  }

  /**
   * Get the underlying wallet synchronization service
   * Useful for debugging or manual operations
   */
  public getWalletSyncService(): WalletSynchronizationService {
    return this.walletSyncService;
  }
}

// Factory function pour créer le scheduler avec toutes les dépendances optimisées
export async function createAutoRefreshScheduler(): Promise<AutoRefreshScheduler> {
  const walletSyncService = await createWalletSynchronizationService(config.RPC_ENDPOINT, config.WALLET_ADDRESS);

  return new AutoRefreshScheduler(walletSyncService);
}
