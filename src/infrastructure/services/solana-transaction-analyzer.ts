import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import type { TransactionAnalyzer } from '@domain/interfaces/transaction-analyzer.js';
import type { Transaction } from '@schemas/participant.schema.js';
import type { WalletAddress } from '@domain/value-objects/wallet-address.js';
import { TransactionAnalysisError } from '@domain/errors/domain-errors.js';
import { RpcServiceManager } from './rpc-service-manager.js';
import { logger } from '@shared/logger.js';

export class SolanaTransactionAnalyzer implements TransactionAnalyzer {
  private readonly rpcServiceManager: RpcServiceManager;

  constructor(rpcEndpoint: string) {
    this.rpcServiceManager = RpcServiceManager.getInstance();
    // Initialize if not already done
    this.rpcServiceManager.initialize(rpcEndpoint);
  }

  async getRecentTransactions(walletAddress: WalletAddress, limit = 20): Promise<string[]> {
    try {
      const rpcService = this.rpcServiceManager.getRpcService();
      const signatures = await rpcService.request('getSignaturesForAddress', [walletAddress.toPublicKey(), { limit }]);

      return signatures.map((sig: any) => sig.signature);
    } catch (error) {
      logger.error('Failed to fetch recent transactions:', error);
      return [];
    }
  }

  async getAllTransactions(walletAddress: WalletAddress, before?: string, limit = 200): Promise<string[]> {
    try {
      const rpcService = this.rpcServiceManager.getRpcService();
      const options: any = { limit };
      if (before) {
        options.before = before;
      }

      const signatures = await rpcService.request('getSignaturesForAddress', [walletAddress.toPublicKey(), options]);

      return signatures.map((sig: any) => sig.signature);
    } catch (error) {
      logger.error('Failed to fetch all transactions:', error);
      return [];
    }
  }

  async analyzeTransaction(signature: string, targetWalletAddress: WalletAddress): Promise<Transaction | null> {
    try {
      const rpcService = this.rpcServiceManager.getRpcService();
      const transaction = await rpcService.request('getTransaction', [
        signature,
        {
          commitment: 'confirmed',
          maxSupportedTransactionVersion: 0,
        },
      ]);

      if (!transaction) return null;

      const preBalances = transaction.meta?.preBalances || [];
      const postBalances = transaction.meta?.postBalances || [];
      const accountKeys = transaction.transaction.message.getAccountKeys();

      // Find the target wallet's account index
      const walletIndex = accountKeys.staticAccountKeys.findIndex(
        (key: any) => key.toString() === targetWalletAddress.toString(),
      );

      if (walletIndex === -1) return null;

      const balanceChange = postBalances[walletIndex] - preBalances[walletIndex];
      const solAmount = balanceChange / LAMPORTS_PER_SOL;

      // Only process incoming transactions
      if (solAmount > 0) {
        // Try to identify the sender
        let senderAddress: string | null = null;
        for (let i = 0; i < accountKeys.staticAccountKeys.length; i++) {
          if (i !== walletIndex) {
            const senderChange = postBalances[i] - preBalances[i];
            if (senderChange < 0) {
              senderAddress = accountKeys.staticAccountKeys[i].toString();
              break;
            }
          }
        }

        return {
          signature,
          solAmount,
          timestamp: transaction.blockTime || Date.now() / 1000,
          slot: transaction.slot,
          senderAddress,
        };
      }

      return null;
    } catch (error) {
      throw new TransactionAnalysisError(signature, error instanceof Error ? error : new Error(String(error)));
    }
  }

  async analyzeAllTransactions(walletAddress: WalletAddress): Promise<Transaction[]> {
    const startTime = Date.now();
    logger.info('Starting optimized transaction analysis with RPC queue');

    // Get all signatures first
    const allSignatures = await this.getAllTransactions(walletAddress);
    logger.info(`Found ${allSignatures.length} total transactions to analyze`);

    if (allSignatures.length === 0) {
      return [];
    }

    const results: Transaction[] = [];
    const batchSize = 10; // Process in batches to avoid overwhelming the queue

    for (let i = 0; i < allSignatures.length; i += batchSize) {
      const batch = allSignatures.slice(i, i + batchSize);

      // Process batch with proper priority and error handling
      const batchPromises = batch.map(async (signature, index) => {
        try {
          const result = await this.analyzeTransaction(signature, walletAddress);
          if (result && result.solAmount > 0) {
            return result;
          }
        } catch (error) {
          logger.debug(`Failed to analyze transaction ${signature}`, error);
        }
        return null;
      });

      const batchResults = await Promise.all(batchPromises);

      // Add non-null results
      for (const result of batchResults) {
        if (result) {
          results.push(result);
        }
      }

      // Progress indicator every 50 transactions
      if (i % 50 === 0) {
        const progress = ((i / allSignatures.length) * 100).toFixed(1);
        const queueStats = this.rpcServiceManager.getStats();
        logger.debug(
          `Transaction analysis progress: ${i}/${allSignatures.length} (${progress}%) - Queue: ${queueStats?.queueSize || 0}, Active: ${queueStats?.activeRequests || 0}`,
        );
      }
    }

    // Sort results by timestamp (newest first)
    results.sort((a, b) => b.timestamp - a.timestamp);

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    logger.info(`Transaction analysis completed: ${results.length} valid transactions found in ${duration}s`);

    return results;
  }

  // Get queue statistics for monitoring
  getQueueStats() {
    return this.rpcServiceManager.getStats();
  }
}
