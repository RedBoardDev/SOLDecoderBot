import type { UserInvestmentRepository } from '@domain/interfaces/user-investment-repository.js';
import { UserInvestment } from '@domain/entities/user-investment.js';
import { UserInvestmentSchema } from '@schemas/user-investment.schema.js';
import DynamoService from '../services/dynamo-service.js';
import { logger } from '@shared/logger.js';
import { config } from '../config/env.js';

export class DynamoUserInvestmentRepository implements UserInvestmentRepository {
  private readonly tableName = config.USER_INVESTMENTS_TABLE;
  private readonly walletAddressGSI = 'WalletAddressIndex';
  private readonly updatedAtGSI = 'UpdatedAtIndex';
  private static dynamoServiceInstance: DynamoService;

  constructor() {
    // Use singleton pattern for DynamoService to reuse connections
    if (!DynamoUserInvestmentRepository.dynamoServiceInstance) {
      DynamoUserInvestmentRepository.dynamoServiceInstance = new DynamoService();
    }
  }

  private get dynamoService(): DynamoService {
    return DynamoUserInvestmentRepository.dynamoServiceInstance;
  }

  async findByDiscordUserId(discordUserId: string): Promise<UserInvestment | null> {
    try {
      const result = await this.dynamoService.get({
        TableName: this.tableName,
        Key: {
          userId: discordUserId, // DynamoDB primary key
        },
      });

      if (!result.Item) {
        return null;
      }

      const validatedData = UserInvestmentSchema.parse(result.Item);
      return UserInvestment.fromData(validatedData);
    } catch (error) {
      logger.error(`Failed to find user investment by Discord ID ${discordUserId}:`, error);
      return null;
    }
  }

  async findByWalletAddress(walletAddress: string): Promise<UserInvestment | null> {
    try {
      const result = await this.dynamoService.query({
        TableName: this.tableName,
        IndexName: this.walletAddressGSI,
        KeyConditionExpression: 'walletAddress = :walletAddress',
        ExpressionAttributeValues: {
          ':walletAddress': walletAddress,
        },
        Limit: 1,
      });

      if (!result.Items || result.Items.length === 0) {
        return null;
      }

      const validatedData = UserInvestmentSchema.parse(result.Items[0]);
      return UserInvestment.fromData(validatedData);
    } catch (error) {
      logger.error(`Failed to find user investment by wallet address ${walletAddress}:`, error);
      return null;
    }
  }

  async findAll(): Promise<UserInvestment[]> {
    try {
      // OPTIMIZATION: Use pagination instead of scanning entire table
      logger.info('Fetching all user investments with pagination to reduce costs');

      const investments: UserInvestment[] = [];
      let lastEvaluatedKey: any = undefined;

      do {
        const result = await this.dynamoService.scan({
          TableName: this.tableName,
          Limit: 100, // Process in smaller batches
          ExclusiveStartKey: lastEvaluatedKey,
          ProjectionExpression: 'userId, walletAddress, investedAmount, createdAt, updatedAt', // Only fetch needed attributes
        });

        if (result.Items) {
          for (const item of result.Items) {
            try {
              const validatedData = UserInvestmentSchema.parse(item);
              investments.push(UserInvestment.fromData(validatedData));
            } catch (validationError) {
              logger.warn('Invalid user investment data found during scan', validationError);
            }
          }
        }

        lastEvaluatedKey = result.LastEvaluatedKey;
      } while (lastEvaluatedKey);

      logger.info(`Found ${investments.length} user investments`);
      return investments;
    } catch (error) {
      logger.error('Failed to find all user investments:', error);
      return [];
    }
  }

  async save(investment: UserInvestment): Promise<void> {
    try {
      const data = investment.toData();
      await this.dynamoService.create({
        TableName: this.tableName,
        Item: data,
        ConditionExpression: 'attribute_not_exists(userId)',
      });

      logger.debug(`User investment saved for Discord ID ${investment.discordUserId}`);
    } catch (error) {
      logger.error(`Failed to save user investment for Discord ID ${investment.discordUserId}:`, error);
      throw error;
    }
  }

  async update(investment: UserInvestment): Promise<void> {
    try {
      const data = investment.toData();
      await this.dynamoService.update({
        TableName: this.tableName,
        Key: { userId: data.userId },
        UpdateExpression:
          'SET walletAddress = :walletAddress, investedAmount = :investedAmount, updatedAt = :updatedAt',
        ExpressionAttributeValues: {
          ':walletAddress': data.walletAddress,
          ':investedAmount': data.investedAmount,
          ':updatedAt': data.updatedAt,
        },
        ConditionExpression: 'attribute_exists(userId)',
      });

      logger.debug(`User investment updated for Discord ID ${investment.discordUserId}`);
    } catch (error) {
      logger.error(`Failed to update user investment for Discord ID ${investment.discordUserId}:`, error);
      throw error;
    }
  }

  async delete(discordUserId: string): Promise<void> {
    try {
      await this.dynamoService.delete({
        TableName: this.tableName,
        Key: { userId: discordUserId },
      });

      logger.debug(`User investment deleted for Discord ID ${discordUserId}`);
    } catch (error) {
      logger.error(`Failed to delete user investment for Discord ID ${discordUserId}:`, error);
      throw error;
    }
  }

  async exists(discordUserId: string): Promise<boolean> {
    try {
      const result = await this.dynamoService.get({
        TableName: this.tableName,
        Key: { userId: discordUserId },
        ProjectionExpression: 'userId',
      });

      return !!result.Item;
    } catch (error) {
      logger.error(`Failed to check if user investment exists for Discord ID ${discordUserId}:`, error);
      return false;
    }
  }

  async findInvestmentsNeedingRefresh(): Promise<UserInvestment[]> {
    try {
      // OPTIMIZATION: Use GSI query instead of expensive table scan
      logger.info('Using optimized GSI query to find investments needing refresh');

      const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);

      const result = await this.dynamoService.query({
        TableName: this.tableName,
        IndexName: this.updatedAtGSI,
        KeyConditionExpression: 'refreshStatus = :status AND updatedAt < :fifteenMinutesAgo',
        ExpressionAttributeValues: {
          ':status': 'ACTIVE',
          ':fifteenMinutesAgo': fifteenMinutesAgo.toISOString(),
        },
        ProjectionExpression: 'userId, walletAddress, investedAmount, createdAt, updatedAt', // Only fetch needed attributes
      });

      if (!result.Items || result.Items.length === 0) {
        return [];
      }

      const investments: UserInvestment[] = [];
      for (const item of result.Items) {
        try {
          const validatedData = UserInvestmentSchema.parse(item);
          investments.push(UserInvestment.fromData(validatedData));
        } catch (validationError) {
          logger.warn('Invalid user investment data found during refresh query', validationError);
        }
      }

      logger.info(`Found ${investments.length} investments needing refresh using optimized query`);
      return investments;
    } catch (error) {
      logger.error('Failed to find investments needing refresh:', error);
      // Fallback to scan if GSI is not available yet
      logger.warn('Falling back to scan operation - consider creating UpdatedAtIndex GSI');
      return this.findInvestmentsNeedingRefreshFallback();
    }
  }

  // Fallback method using scan (only if GSI not available)
  private async findInvestmentsNeedingRefreshFallback(): Promise<UserInvestment[]> {
    try {
      logger.warn('Using DynamoDB scan operation - this may be expensive');

      const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);

      const result = await this.dynamoService.scan({
        TableName: this.tableName,
        FilterExpression: 'updatedAt < :fifteenMinutesAgo',
        ExpressionAttributeValues: {
          ':fifteenMinutesAgo': fifteenMinutesAgo.toISOString(),
        },
        ProjectionExpression: 'userId, walletAddress, investedAmount, createdAt, updatedAt',
      });

      if (!result.Items || result.Items.length === 0) {
        return [];
      }

      const investments: UserInvestment[] = [];
      for (const item of result.Items) {
        try {
          const validatedData = UserInvestmentSchema.parse(item);
          investments.push(UserInvestment.fromData(validatedData));
        } catch (validationError) {
          logger.warn('Invalid user investment data found during fallback scan', validationError);
        }
      }

      return investments;
    } catch (error) {
      logger.error('Failed to find investments needing refresh (fallback):', error);
      return [];
    }
  }

  async batchUpdate(investments: UserInvestment[]): Promise<void> {
    try {
      if (investments.length === 0) {
        return;
      }

      // DynamoDB batch operations support max 25 items
      const batchSize = 25;

      for (let i = 0; i < investments.length; i += batchSize) {
        const batch = investments.slice(i, i + batchSize);

        const requestItems = batch.map((investment) => {
          const data = investment.toData();
          return {
            PutRequest: {
              Item: data,
            },
          };
        });

        await this.dynamoService.batchWrite({
          RequestItems: {
            [this.tableName]: requestItems,
          },
        });

        logger.debug(`Batch updated ${batch.length} user investments`);
      }

      logger.info(`Successfully batch updated ${investments.length} user investments`);
    } catch (error) {
      logger.error('Failed to batch update user investments:', error);
      throw error;
    }
  }
}
