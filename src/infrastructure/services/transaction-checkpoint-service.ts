import type { TransactionCheckpointRepository } from '@domain/interfaces/transaction-checkpoint-repository.js';
import { DynamoTransactionCheckpointRepository } from '../repositories/dynamo-transaction-checkpoint-repository.js';
import type { TransactionCheckpoint } from '@schemas/transaction-checkpoint.schema.js';
import { logger } from '@shared/logger.js';

export class TransactionCheckpointService {
  private checkpointRepository: TransactionCheckpointRepository;

  constructor(checkpointRepository?: TransactionCheckpointRepository) {
    this.checkpointRepository = checkpointRepository || new DynamoTransactionCheckpointRepository();
  }

  /**
   * Get the last processed transaction signature for a wallet
   * Returns null if no checkpoint exists (process from beginning)
   */
  async getLastProcessedSignature(walletAddress: string): Promise<string | null> {
    try {
      const checkpoint = await this.checkpointRepository.findByWalletAddress(walletAddress);
      return checkpoint?.lastProcessedSignature || null;
    } catch (error) {
      logger.error(`Failed to get last processed signature for wallet ${walletAddress}:`, error);
      return null; // Return null to process from beginning on error
    }
  }

  /**
   * Get the last processed transaction timestamp for a wallet
   * Returns 0 if no checkpoint exists (process from beginning)
   */
  async getLastProcessedTimestamp(walletAddress: string): Promise<number> {
    try {
      const checkpoint = await this.checkpointRepository.findByWalletAddress(walletAddress);
      return checkpoint?.lastProcessedTimestamp || 0;
    } catch (error) {
      logger.error(`Failed to get last processed timestamp for wallet ${walletAddress}:`, error);
      return 0; // Return 0 to process from beginning on error
    }
  }

  /**
   * Update the checkpoint with the latest processed transaction
   */
  async updateCheckpoint(walletAddress: string, signature: string, timestamp: number): Promise<void> {
    try {
      const existingCheckpoint = await this.checkpointRepository.findByWalletAddress(walletAddress);

      if (existingCheckpoint) {
        // Update existing checkpoint
        const updatedCheckpoint: TransactionCheckpoint = {
          walletAddress,
          lastProcessedSignature: signature,
          lastProcessedTimestamp: timestamp,
          updatedAt: new Date().toISOString(),
        };
        await this.checkpointRepository.update(updatedCheckpoint);
      } else {
        // Create new checkpoint
        const newCheckpoint: TransactionCheckpoint = {
          walletAddress,
          lastProcessedSignature: signature,
          lastProcessedTimestamp: timestamp,
          updatedAt: new Date().toISOString(),
        };
        await this.checkpointRepository.save(newCheckpoint);
      }

      logger.debug(`✅ Checkpoint updated for wallet ${walletAddress}: ${signature}`);
    } catch (error) {
      logger.error(`Failed to update checkpoint for wallet ${walletAddress}:`, error);
      throw error;
    }
  }

  /**
   * Check if a transaction has already been processed
   */
  async hasProcessedTransaction(walletAddress: string, signature: string): Promise<boolean> {
    try {
      return await this.checkpointRepository.hasProcessedTransaction(walletAddress, signature);
    } catch (error) {
      logger.error(
        `Failed to check if transaction ${signature} has been processed for wallet ${walletAddress}:`,
        error,
      );
      return false; // Return false to avoid skipping transactions on error
    }
  }

  /**
   * Get the checkpoint for a specific wallet
   */
  async getCheckpoint(walletAddress: string): Promise<TransactionCheckpoint | null> {
    try {
      return await this.checkpointRepository.findByWalletAddress(walletAddress);
    } catch (error) {
      logger.error(`Failed to get checkpoint for wallet ${walletAddress}:`, error);
      return null;
    }
  }

  /**
   * Delete a checkpoint for a wallet (useful for resetting processing)
   */
  async deleteCheckpoint(walletAddress: string): Promise<void> {
    try {
      await this.checkpointRepository.delete(walletAddress);
      logger.debug(`✅ Checkpoint deleted for wallet ${walletAddress}`);
    } catch (error) {
      logger.error(`Failed to delete checkpoint for wallet ${walletAddress}:`, error);
      throw error;
    }
  }

  /**
   * Get all checkpoints (for batch processing)
   */
  async getAllCheckpoints(): Promise<TransactionCheckpoint[]> {
    try {
      return await this.checkpointRepository.findAll();
    } catch (error) {
      logger.error('Failed to get all checkpoints:', error);
      return [];
    }
  }

  /**
   * Determine if we should process a transaction based on its timestamp
   * Only process transactions newer than the last processed timestamp
   */
  shouldProcessTransaction(
    walletAddress: string,
    transactionTimestamp: number,
    lastProcessedTimestamp: number,
  ): boolean {
    // Process if transaction is newer than the last processed timestamp
    return transactionTimestamp > lastProcessedTimestamp;
  }

  /**
   * Update checkpoint using the convenient method
   */
  async updateLastProcessed(walletAddress: string, signature: string, timestamp: number): Promise<void> {
    try {
      await this.checkpointRepository.updateLastProcessed(walletAddress, signature, timestamp);
      logger.debug(`✅ Last processed updated for wallet ${walletAddress}: ${signature}`);
    } catch (error) {
      logger.error(`Failed to update last processed for wallet ${walletAddress}:`, error);
      throw error;
    }
  }
}
