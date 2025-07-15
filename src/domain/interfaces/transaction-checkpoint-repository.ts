import type { TransactionCheckpoint } from '@schemas/transaction-checkpoint.schema.js';

export interface TransactionCheckpointRepository {
  /**
   * Find checkpoint by wallet address
   * Uses DynamoDB query operation (cost-effective)
   */
  findByWalletAddress(walletAddress: string): Promise<TransactionCheckpoint | null>;

  /**
   * Save a new checkpoint
   * Uses DynamoDB put operation
   */
  save(checkpoint: TransactionCheckpoint): Promise<void>;

  /**
   * Update an existing checkpoint
   * Uses DynamoDB update operation (cost-effective)
   */
  update(checkpoint: TransactionCheckpoint): Promise<void>;

  /**
   * Delete a checkpoint
   * Uses DynamoDB delete operation
   */
  delete(walletAddress: string): Promise<void>;

  /**
   * Get all checkpoints (for batch processing)
   * Uses DynamoDB scan operation (use sparingly)
   */
  findAll(): Promise<TransactionCheckpoint[]>;

  /**
   * Update checkpoint with new transaction signature
   * Uses DynamoDB update operation with conditional expression
   */
  updateLastProcessed(walletAddress: string, signature: string, timestamp: number): Promise<void>;

  /**
   * Check if a transaction has been processed
   * Uses DynamoDB query operation with projection (minimal cost)
   */
  hasProcessedTransaction(walletAddress: string, signature: string): Promise<boolean>;
}
