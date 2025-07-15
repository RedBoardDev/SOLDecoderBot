import type { Role } from 'discord.js';
import { DiscordClientManager } from './discord-client-manager.js';
import { logger } from '@shared/logger.js';
import { config } from '@config/env.js';
import { DiscordAPIError } from 'discord.js';

export interface RoleChangeResult {
  userId: string;
  username?: string;
  action: 'added' | 'removed' | 'no_change' | 'error';
  error?: string;
  hadRole: boolean;
  shouldHaveRole: boolean;
  permissionError?: boolean; // New field for permission-specific errors
}

export interface RoleSyncSummary {
  totalProcessed: number;
  rolesAdded: number;
  rolesRemoved: number;
  errors: number;
  permissionErrors: number; // New field for permission error count
  unchanged: number;
  results: RoleChangeResult[];
  processingTime: number;
}

export class DiscordRoleManagementService {
  private readonly discordManager: DiscordClientManager;
  private farmerRole: Role | null = null;
  private readonly BATCH_SIZE = 10; // Discord rate limit friendly
  private readonly BATCH_DELAY = 1000; // 1 second between batches

  constructor() {
    this.discordManager = DiscordClientManager.getInstance();
  }

  /**
   * Initialize the role management service by caching the farmer role
   */
  async initialize(): Promise<void> {
    if (!this.discordManager.isInitialized()) {
      throw new Error('Discord Client Manager must be initialized first');
    }

    try {
      const guild = this.discordManager.getGuild();
      this.farmerRole = await guild.roles.fetch(config.FARMER_ROLE_ID);

      if (!this.farmerRole) {
        throw new Error(`Farmer role with ID ${config.FARMER_ROLE_ID} not found in guild`);
      }

      logger.info(`Farmer role cached: ${this.farmerRole.name} (${this.farmerRole.members.size} members)`);
    } catch (error) {
      logger.error('Failed to initialize Discord Role Management Service:', error);
      throw error;
    }
  }

  /**
   * Sync roles for a list of users based on their SOL amounts
   * Uses batch processing to respect Discord rate limits
   */
  async syncRolesForUsers(userSolAmounts: Array<{ userId: string; solAmount: number }>): Promise<RoleSyncSummary> {
    const startTime = Date.now();

    if (!this.farmerRole) {
      throw new Error('Role management service not initialized. Call initialize() first.');
    }

    logger.info(`Starting role sync for ${userSolAmounts.length} users`);

    const results: RoleChangeResult[] = [];
    let rolesAdded = 0;
    let rolesRemoved = 0;
    let errors = 0;
    let permissionErrors = 0;
    let unchanged = 0;

    // Process in batches to respect Discord rate limits
    for (let i = 0; i < userSolAmounts.length; i += this.BATCH_SIZE) {
      const batch = userSolAmounts.slice(i, i + this.BATCH_SIZE);

      logger.debug(
        `Processing role sync batch ${Math.floor(i / this.BATCH_SIZE) + 1}/${Math.ceil(userSolAmounts.length / this.BATCH_SIZE)}`,
      );

      // Process batch in parallel
      const batchPromises = batch.map(({ userId, solAmount }) => this.syncRoleForUser(userId, solAmount));

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);

      // Count results
      for (const result of batchResults) {
        switch (result.action) {
          case 'added':
            rolesAdded++;
            break;
          case 'removed':
            rolesRemoved++;
            break;
          case 'error':
            errors++;
            if (result.permissionError) {
              permissionErrors++;
            }
            break;
          case 'no_change':
            unchanged++;
            break;
        }
      }

      // Delay between batches to avoid rate limits (except for last batch)
      if (i + this.BATCH_SIZE < userSolAmounts.length) {
        await this.delay(this.BATCH_DELAY);
      }
    }

    const totalProcessingTime = Date.now() - startTime;

    const summary: RoleSyncSummary = {
      totalProcessed: userSolAmounts.length,
      rolesAdded,
      rolesRemoved,
      errors,
      permissionErrors,
      unchanged,
      results,
      processingTime: totalProcessingTime,
    };

    logger.info(
      `Role sync completed: +${rolesAdded} -${rolesRemoved} errors:${errors} (${permissionErrors} permission errors) unchanged:${unchanged} (${totalProcessingTime}ms)`,
    );

    return summary;
  }

  /**
   * Sync role for a single user based on their SOL amount
   */
  private async syncRoleForUser(userId: string, solAmount: number): Promise<RoleChangeResult> {
    const shouldHaveRole = solAmount >= config.FARMER_MIN_SOL_AMOUNT;

    try {
      const guild = this.discordManager.getGuild();
      const member = await guild.members.fetch(userId);

      if (!member) {
        return {
          userId,
          action: 'error',
          error: 'Member not found in guild',
          hadRole: false,
          shouldHaveRole,
        };
      }

      const hadRole = member.roles.cache.has(config.FARMER_ROLE_ID);

      // Determine action needed
      if (shouldHaveRole && !hadRole) {
        // Add role
        await member.roles.add(this.farmerRole!);
        logger.debug(`✅ Added farmer role to ${member.user.username} (${solAmount.toFixed(4)} SOL)`);

        return {
          userId,
          username: member.user.username,
          action: 'added',
          hadRole,
          shouldHaveRole,
        };
      } else if (!shouldHaveRole && hadRole) {
        // Remove role
        await member.roles.remove(this.farmerRole!);
        logger.debug(`❌ Removed farmer role from ${member.user.username} (${solAmount.toFixed(4)} SOL)`);

        return {
          userId,
          username: member.user.username,
          action: 'removed',
          hadRole,
          shouldHaveRole,
        };
      } else {
        // No change needed
        return {
          userId,
          username: member.user.username,
          action: 'no_change',
          hadRole,
          shouldHaveRole,
        };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const isPermissionError = error instanceof DiscordAPIError && error.code === 50013;

      if (isPermissionError) {
        logger.error(`🔒 Permission error for user ${userId}: Missing MANAGE_ROLES permission or role hierarchy issue`);
        return {
          userId,
          action: 'error',
          error: 'Missing Discord permissions: MANAGE_ROLES required or role hierarchy issue',
          hadRole: false,
          shouldHaveRole,
          permissionError: true,
        };
      } else {
        logger.error(`Failed to sync role for user ${userId}:`, error);
        return {
          userId,
          action: 'error',
          error: errorMessage,
          hadRole: false,
          shouldHaveRole,
        };
      }
    }
  }

  /**
   * Get current farmer role statistics
   */
  async getFarmerRoleStats(): Promise<{ totalMembers: number; roleMembers: number; roleName: string }> {
    if (!this.farmerRole) {
      throw new Error('Role management service not initialized');
    }

    const guild = this.discordManager.getGuild();

    return {
      totalMembers: guild.memberCount,
      roleMembers: this.farmerRole.members.size,
      roleName: this.farmerRole.name,
    };
  }

  /**
   * Check if a user has the farmer role
   */
  async userHasFarmerRole(userId: string): Promise<boolean> {
    try {
      const guild = this.discordManager.getGuild();
      const member = await guild.members.fetch(userId);
      return member?.roles.cache.has(config.FARMER_ROLE_ID) || false;
    } catch (error) {
      logger.error(`Failed to check farmer role for user ${userId}:`, error);
      return false;
    }
  }

  /**
   * Force refresh the farmer role cache
   */
  async refreshFarmerRole(): Promise<void> {
    const guild = this.discordManager.getGuild();
    this.farmerRole = await guild.roles.fetch(config.FARMER_ROLE_ID, { force: true });

    if (!this.farmerRole) {
      throw new Error(`Farmer role with ID ${config.FARMER_ROLE_ID} not found in guild`);
    }

    logger.debug(`Farmer role refreshed: ${this.farmerRole.name}`);
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
