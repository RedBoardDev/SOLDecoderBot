import { logger } from '@shared/logger.js';
import { DynamoUserInvestmentRepository } from '@repositories/dynamo-user-investment-repository.js';
import { TransactionCheckpointService } from './transaction-checkpoint-service.js';
import { SolanaTransactionAnalyzer } from './solana-transaction-analyzer.js';
import { DiscordRoleManagementService, type RoleSyncSummary } from './discord-role-management-service.js';
import type { UserInvestment } from '@domain/entities/user-investment.js';
import { WalletAddress } from '@domain/value-objects/wallet-address.js';
import type { Transaction } from '@schemas/participant.schema.js';

export interface WalletSyncResult {
  walletAddress: string;
  previousAmount: number;
  newTransactions: Transaction[];
  newTotalAmount: number;
  processed: boolean;
  error?: string;
}

export interface SyncSummary {
  totalWallets: number;
  successfulSyncs: number;
  failedSyncs: number;
  newTransactionsFound: number;
  totalProcessingTime: number;
  results: WalletSyncResult[];
  roleSyncSummary?: RoleSyncSummary; // Optional role sync results
}

/**
 * Optimized wallet synchronization service that only processes registered wallets
 * Centralizes sync logic to avoid duplication and improve performance
 */
export class WalletSynchronizationService {
  constructor(
    private userInvestmentRepository: DynamoUserInvestmentRepository,
    private transactionAnalyzer: SolanaTransactionAnalyzer,
    private checkpointService: TransactionCheckpointService,
    private roleManagementService: DiscordRoleManagementService,
    private targetWalletAddress: string,
  ) {}

  /**
   * Synchronize a single wallet's investment data
   * Only processes new transactions since last checkpoint
   */
  async syncWalletInvestment(userInvestment: UserInvestment): Promise<WalletSyncResult> {
    const startTime = Date.now();
    const result: WalletSyncResult = {
      walletAddress: userInvestment.walletAddress,
      previousAmount: userInvestment.investedAmount,
      newTransactions: [],
      newTotalAmount: userInvestment.investedAmount,
      processed: false,
    };

    try {
      logger.debug(`Syncing wallet ${userInvestment.walletAddress}`);

      // Get last processed timestamp to avoid re-processing old transactions
      const lastProcessedTimestamp = await this.checkpointService.getLastProcessedTimestamp(
        userInvestment.walletAddress,
      );

      // Get new transactions for this specific wallet only
      const newTransactions = await this.getNewTransactionsForWallet(
        userInvestment.walletAddress,
        lastProcessedTimestamp,
      );

      result.newTransactions = newTransactions;

      if (newTransactions.length > 0) {
        // Calculate additional investment from new transactions
        const additionalInvestment = newTransactions.reduce((sum, tx) => sum + tx.solAmount, 0);
        const newTotalAmount = userInvestment.investedAmount + additionalInvestment;

        // Update the investment entity
        userInvestment.updateInvestedAmount(newTotalAmount);
        await this.userInvestmentRepository.update(userInvestment);

        // Update checkpoint with latest transaction
        const latestTransaction = newTransactions.reduce((latest, current) =>
          current.timestamp > latest.timestamp ? current : latest,
        );
        await this.checkpointService.updateCheckpoint(
          userInvestment.walletAddress,
          latestTransaction.signature,
          Math.floor(latestTransaction.timestamp),
        );

        result.newTotalAmount = newTotalAmount;

        logger.debug(
          `Wallet ${userInvestment.walletAddress} synced: +${additionalInvestment.toFixed(4)} SOL (${newTransactions.length} new transactions)`,
        );
      } else {
        // Even if no new transactions, update the timestamp to indicate sync was performed
        userInvestment.updateInvestedAmount(userInvestment.investedAmount);
        await this.userInvestmentRepository.update(userInvestment);
        logger.debug(`Wallet ${userInvestment.walletAddress} already up to date - timestamp refreshed`);
      }

      result.processed = true;
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      result.error = errorMessage;
      logger.error(`Failed to sync wallet ${userInvestment.walletAddress}: ${errorMessage}`);
      return result;
    }
  }

  /**
   * Synchronize all registered wallets
   * Optimized batch processing with error resilience
   */
  async syncAllWallets(options: { batchSize?: number; delayBetweenBatches?: number } = {}): Promise<SyncSummary> {
    const { batchSize = 5, delayBetweenBatches = 100 } = options;
    const startTime = Date.now();

    logger.info('Starting optimized wallet synchronization for all registered wallets');

    // Get all registered investments
    const allInvestments = await this.userInvestmentRepository.findAll();

    if (allInvestments.length === 0) {
      logger.info('No registered wallets to synchronize');
      return {
        totalWallets: 0,
        successfulSyncs: 0,
        failedSyncs: 0,
        newTransactionsFound: 0,
        totalProcessingTime: 0,
        results: [],
      };
    }

    logger.info(`Found ${allInvestments.length} registered wallets to synchronize`);

    const results: WalletSyncResult[] = [];
    let successfulSyncs = 0;
    let failedSyncs = 0;
    let totalNewTransactions = 0;

    // Process in batches to avoid overwhelming the RPC/database
    for (let i = 0; i < allInvestments.length; i += batchSize) {
      const batch = allInvestments.slice(i, i + batchSize);

      // Process batch in parallel
      const batchPromises = batch.map((investment) => this.syncWalletInvestment(investment));
      const batchResults = await Promise.all(batchPromises);

      // Process results
      for (const result of batchResults) {
        results.push(result);

        if (result.processed && !result.error) {
          successfulSyncs++;
          totalNewTransactions += result.newTransactions.length;
        } else {
          failedSyncs++;
        }
      }

      // Small delay between batches to be respectful to services
      if (i + batchSize < allInvestments.length) {
        await this.delay(delayBetweenBatches);
      }

      // Log progress every few batches
      if ((i + batchSize) % 20 === 0 || i + batchSize >= allInvestments.length) {
        const processed = Math.min(i + batchSize, allInvestments.length);
        logger.info(
          `Synchronization progress: ${processed}/${allInvestments.length} wallets processed (${totalNewTransactions} new transactions found)`,
        );
      }
    }

    const totalProcessingTime = Date.now() - startTime;

    // Perform role synchronization after wallet sync
    let roleSyncSummary: RoleSyncSummary | undefined;
    try {
      if (this.roleManagementService && allInvestments.length > 0) {
        logger.info('Starting role synchronization after wallet sync');

        // Prepare user SOL amounts for role sync
        const userSolAmounts = allInvestments.map((investment) => ({
          userId: investment.discordUserId,
          solAmount: investment.investedAmount,
        }));

        roleSyncSummary = await this.roleManagementService.syncRolesForUsers(userSolAmounts);

        // Enhanced logging for role sync results
        if (roleSyncSummary.rolesAdded > 0 || roleSyncSummary.rolesRemoved > 0) {
          logger.info(
            `🎭 Role sync: +${roleSyncSummary.rolesAdded} farmer roles added, -${roleSyncSummary.rolesRemoved} farmer roles removed`,
          );
        }

        if (roleSyncSummary.permissionErrors > 0) {
          logger.warn(
            `🔒 Role sync had ${roleSyncSummary.permissionErrors} permission errors - check bot permissions and role hierarchy`,
          );
        }

        if (roleSyncSummary.errors > 0) {
          logger.warn(`⚠️ Role sync had ${roleSyncSummary.errors} errors during processing`);
        }

        logger.debug(
          `Role sync summary: ${roleSyncSummary.unchanged} unchanged, ${roleSyncSummary.totalProcessed} total processed in ${roleSyncSummary.processingTime}ms`,
        );
      }
    } catch (roleError) {
      logger.error('Failed to perform role synchronization:', roleError);
      // Don't fail the entire sync if role sync fails
    }

    const summary: SyncSummary = {
      totalWallets: allInvestments.length,
      successfulSyncs,
      failedSyncs,
      newTransactionsFound: totalNewTransactions,
      totalProcessingTime,
      results,
      roleSyncSummary,
    };

    logger.info(
      `Wallet synchronization completed: ${successfulSyncs}/${allInvestments.length} successful, ${totalNewTransactions} new transactions found (${(totalProcessingTime / 1000).toFixed(2)}s)`,
    );

    return summary;
  }

  /**
   * Synchronize specific wallets (for admin commands)
   * Force refresh regardless of recent updates
   */
  async syncSpecificWallets(walletAddresses: string[]): Promise<SyncSummary> {
    const startTime = Date.now();

    logger.info(`Starting forced synchronization for ${walletAddresses.length} specific wallets`);

    const results: WalletSyncResult[] = [];
    let successfulSyncs = 0;
    let failedSyncs = 0;
    let totalNewTransactions = 0;

    for (const walletAddress of walletAddresses) {
      try {
        // Get the investment record
        const investment = await this.userInvestmentRepository.findByWalletAddress(walletAddress);

        if (!investment) {
          logger.warn(`Wallet ${walletAddress} not found in database, skipping`);
          results.push({
            walletAddress,
            previousAmount: 0,
            newTransactions: [],
            newTotalAmount: 0,
            processed: false,
            error: 'Wallet not registered',
          });
          failedSyncs++;
          continue;
        }

        // Sync the wallet
        const result = await this.syncWalletInvestment(investment);
        results.push(result);

        if (result.processed && !result.error) {
          successfulSyncs++;
          totalNewTransactions += result.newTransactions.length;
        } else {
          failedSyncs++;
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger.error(`Failed to sync specific wallet ${walletAddress}: ${errorMessage}`);

        results.push({
          walletAddress,
          previousAmount: 0,
          newTransactions: [],
          newTotalAmount: 0,
          processed: false,
          error: errorMessage,
        });
        failedSyncs++;
      }
    }

    const totalProcessingTime = Date.now() - startTime;
    const summary: SyncSummary = {
      totalWallets: walletAddresses.length,
      successfulSyncs,
      failedSyncs,
      newTransactionsFound: totalNewTransactions,
      totalProcessingTime,
      results,
    };

    logger.info(
      `Specific wallet synchronization completed: ${successfulSyncs}/${walletAddresses.length} successful, ${totalNewTransactions} new transactions found (${(totalProcessingTime / 1000).toFixed(2)}s)`,
    );

    return summary;
  }

  /**
   * Get new transactions for a specific wallet
   * Optimized to only fetch what we need
   */
  private async getNewTransactionsForWallet(
    walletAddress: string,
    lastProcessedTimestamp: number,
  ): Promise<Transaction[]> {
    try {
      const walletAddr = WalletAddress.create(walletAddress);

      // Get all transactions for this wallet (this is already optimized in the analyzer)
      const allTransactions = await this.transactionAnalyzer.analyzeAllTransactions(
        WalletAddress.create(this.targetWalletAddress),
      );

      // Filter to only this specific wallet's transactions that are newer than last processed
      const relevantTransactions = allTransactions.filter(
        (tx) =>
          tx.senderAddress === walletAddress && // Only transactions FROM this wallet (investments)
          tx.timestamp > lastProcessedTimestamp && // Only new transactions
          tx.solAmount > 0, // Only positive amounts (incoming to target wallet)
      );

      logger.debug(
        `Found ${relevantTransactions.length} new transactions for wallet ${walletAddress} since timestamp ${lastProcessedTimestamp}`,
      );

      return relevantTransactions;
    } catch (error) {
      logger.error(`Failed to get new transactions for wallet ${walletAddress}:`, error);
      return [];
    }
  }

  /**
   * Get sync statistics for monitoring
   */
  async getSyncStatistics(): Promise<{
    totalRegisteredWallets: number;
    lastSyncTime?: Date;
    averageTransactionsPerWallet: number;
  }> {
    try {
      const allInvestments = await this.userInvestmentRepository.findAll();
      const totalTransactions = allInvestments.reduce((sum, inv) => sum + (inv.investedAmount > 0 ? 1 : 0), 0);

      return {
        totalRegisteredWallets: allInvestments.length,
        averageTransactionsPerWallet: allInvestments.length > 0 ? totalTransactions / allInvestments.length : 0,
      };
    } catch (error) {
      logger.error('Failed to get sync statistics:', error);
      return {
        totalRegisteredWallets: 0,
        averageTransactionsPerWallet: 0,
      };
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Get the user investment repository (for backward compatibility)
   */
  getUserInvestmentRepository(): DynamoUserInvestmentRepository {
    return this.userInvestmentRepository;
  }

  /**
   * Get the checkpoint service (for backward compatibility)
   */
  getCheckpointService(): TransactionCheckpointService {
    return this.checkpointService;
  }
}

/**
 * Factory function to create the synchronization service with all dependencies
 */
export async function createWalletSynchronizationService(
  rpcEndpoint: string,
  targetWalletAddress: string,
): Promise<WalletSynchronizationService> {
  const userInvestmentRepository = new DynamoUserInvestmentRepository();
  const transactionAnalyzer = new SolanaTransactionAnalyzer(rpcEndpoint);
  const checkpointService = new TransactionCheckpointService();
  const roleManagementService = new DiscordRoleManagementService();

  // Initialize role management service if Discord client is available
  try {
    await roleManagementService.initialize();
  } catch (error) {
    logger.warn('Role management service initialization failed - roles will not be synced:', error);
  }

  return new WalletSynchronizationService(
    userInvestmentRepository,
    transactionAnalyzer,
    checkpointService,
    roleManagementService,
    targetWalletAddress,
  );
}
