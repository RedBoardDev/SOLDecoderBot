import type { UserInvestment } from '../entities/user-investment.js';

export interface UserInvestmentRepository {
  /**
   * Find user investment by Discord user ID (primary key)
   * Uses DynamoDB query operation (cost-effective)
   */
  findByDiscordUserId(discordUserId: string): Promise<UserInvestment | null>;

  /**
   * Find user investment by wallet address
   * Uses DynamoDB query with GSI if available, otherwise query with filter
   */
  findByWalletAddress(walletAddress: string): Promise<UserInvestment | null>;

  /**
   * Get all user investments
   * Uses DynamoDB scan operation (should be used sparingly)
   */
  findAll(): Promise<UserInvestment[]>;

  /**
   * Save a new user investment
   * Uses DynamoDB put operation
   */
  save(investment: UserInvestment): Promise<void>;

  /**
   * Update an existing user investment
   * Uses DynamoDB update operation (cost-effective)
   */
  update(investment: UserInvestment): Promise<void>;

  /**
   * Delete a user investment
   * Uses DynamoDB delete operation
   */
  delete(discordUserId: string): Promise<void>;

  /**
   * Check if a user investment exists
   * Uses DynamoDB query operation with projection (minimal cost)
   */
  exists(discordUserId: string): Promise<boolean>;

  /**
   * Get investments that need refresh (updated more than 15 minutes ago)
   * Uses DynamoDB scan with filter expression (use carefully)
   */
  findInvestmentsNeedingRefresh(): Promise<UserInvestment[]>;

  /**
   * Batch update multiple investments
   * Uses DynamoDB batch write operation (cost-effective for multiple updates)
   */
  batchUpdate(investments: UserInvestment[]): Promise<void>;
}
