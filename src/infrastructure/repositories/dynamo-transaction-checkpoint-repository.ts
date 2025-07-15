import type { TransactionCheckpointRepository } from '@domain/interfaces/transaction-checkpoint-repository.js';
import { TransactionCheckpointSchema, type TransactionCheckpoint } from '@schemas/transaction-checkpoint.schema.js';
import DynamoService from '../services/dynamo-service.js';
import { logger } from '@shared/logger.js';
import { config } from '../config/env.js';

export class DynamoTransactionCheckpointRepository implements TransactionCheckpointRepository {
  private readonly tableName = config.TRANSACTION_CHECKPOINTS_TABLE;
  private static dynamoServiceInstance: DynamoService;

  constructor() {
    // Use singleton pattern for DynamoService to reuse connections
    if (!DynamoTransactionCheckpointRepository.dynamoServiceInstance) {
      DynamoTransactionCheckpointRepository.dynamoServiceInstance = new DynamoService();
    }
  }

  private get dynamoService(): DynamoService {
    return DynamoTransactionCheckpointRepository.dynamoServiceInstance;
  }

  async findByWalletAddress(walletAddress: string): Promise<TransactionCheckpoint | null> {
    try {
      const result = await this.dynamoService.get({
        TableName: this.tableName,
        Key: {
          walletAddress,
        },
      });

      if (!result.Item) {
        return null;
      }

      const validatedData = TransactionCheckpointSchema.parse(result.Item);
      return validatedData;
    } catch (error) {
      logger.error(`Failed to find transaction checkpoint for wallet ${walletAddress}:`, error);
      return null;
    }
  }

  async save(checkpoint: TransactionCheckpoint): Promise<void> {
    try {
      const validatedData = TransactionCheckpointSchema.parse(checkpoint);
      await this.dynamoService.create({
        TableName: this.tableName,
        Item: validatedData,
        ConditionExpression: 'attribute_not_exists(walletAddress)',
      });

      logger.debug(`✅ Transaction checkpoint saved for wallet: ${checkpoint.walletAddress}`);
    } catch (error) {
      logger.error(`Failed to save transaction checkpoint for wallet ${checkpoint.walletAddress}:`, error);
      throw error;
    }
  }

  async update(checkpoint: TransactionCheckpoint): Promise<void> {
    try {
      const validatedData = TransactionCheckpointSchema.parse(checkpoint);
      await this.dynamoService.update({
        TableName: this.tableName,
        Key: {
          walletAddress: checkpoint.walletAddress,
        },
        UpdateExpression:
          'SET lastProcessedSignature = :lastProcessedSignature, lastProcessedTimestamp = :lastProcessedTimestamp, updatedAt = :updatedAt',
        ExpressionAttributeValues: {
          ':lastProcessedSignature': validatedData.lastProcessedSignature,
          ':lastProcessedTimestamp': validatedData.lastProcessedTimestamp,
          ':updatedAt': validatedData.updatedAt,
        },
        ConditionExpression: 'attribute_exists(walletAddress)',
      });

      logger.debug(`✅ Transaction checkpoint updated for wallet: ${checkpoint.walletAddress}`);
    } catch (error) {
      logger.error(`Failed to update transaction checkpoint for wallet ${checkpoint.walletAddress}:`, error);
      throw error;
    }
  }

  async delete(walletAddress: string): Promise<void> {
    try {
      await this.dynamoService.delete({
        TableName: this.tableName,
        Key: {
          walletAddress,
        },
        ConditionExpression: 'attribute_exists(walletAddress)',
      });

      logger.debug(`✅ Transaction checkpoint deleted for wallet: ${walletAddress}`);
    } catch (error) {
      logger.error(`Failed to delete transaction checkpoint for wallet ${walletAddress}:`, error);
      throw error;
    }
  }

  async findAll(): Promise<TransactionCheckpoint[]> {
    try {
      // OPTIMIZATION: Use pagination and projection to reduce scan costs
      logger.info('Fetching all transaction checkpoints with pagination to reduce costs');

      const checkpoints: TransactionCheckpoint[] = [];
      let lastEvaluatedKey: any = undefined;

      do {
        const result = await this.dynamoService.scan({
          TableName: this.tableName,
          Limit: 50, // Smaller batches since checkpoints are fewer
          ExclusiveStartKey: lastEvaluatedKey,
          ProjectionExpression: 'walletAddress, lastProcessedSignature, lastProcessedTimestamp, updatedAt',
        });

        if (result.Items) {
          for (const item of result.Items) {
            try {
              const validatedData = TransactionCheckpointSchema.parse(item);
              checkpoints.push(validatedData);
            } catch (validationError) {
              logger.warn('Invalid transaction checkpoint data found during scan', validationError);
            }
          }
        }

        lastEvaluatedKey = result.LastEvaluatedKey;
      } while (lastEvaluatedKey);

      logger.info(`Found ${checkpoints.length} transaction checkpoints`);
      return checkpoints;
    } catch (error) {
      logger.error('Failed to find all transaction checkpoints:', error);
      return [];
    }
  }

  async updateLastProcessed(walletAddress: string, signature: string, timestamp: number): Promise<void> {
    try {
      const now = new Date().toISOString();
      await this.dynamoService.update({
        TableName: this.tableName,
        Key: {
          walletAddress,
        },
        UpdateExpression:
          'SET lastProcessedSignature = :lastProcessedSignature, lastProcessedTimestamp = :lastProcessedTimestamp, updatedAt = :updatedAt',
        ExpressionAttributeValues: {
          ':lastProcessedSignature': signature,
          ':lastProcessedTimestamp': timestamp,
          ':updatedAt': now,
        },
        // Use upsert behavior - create if doesn't exist, update if exists
      });

      logger.debug(`✅ Last processed transaction updated for wallet ${walletAddress}: ${signature}`);
    } catch (error) {
      logger.error(`Failed to update last processed transaction for wallet ${walletAddress}:`, error);
      throw error;
    }
  }

  async hasProcessedTransaction(walletAddress: string, signature: string): Promise<boolean> {
    try {
      const checkpoint = await this.findByWalletAddress(walletAddress);

      if (!checkpoint) {
        return false; // No checkpoint exists, transaction hasn't been processed
      }

      return checkpoint.lastProcessedSignature === signature;
    } catch (error) {
      logger.error(
        `Failed to check if transaction ${signature} has been processed for wallet ${walletAddress}:`,
        error,
      );
      return false; // Err on the side of caution
    }
  }
}
