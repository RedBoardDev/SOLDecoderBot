import { z } from 'zod';

export const ConfigSchema = z.object({
  DISCORD_TOKEN: z.string().min(1, 'Discord token is required'),
  DISCORD_CLIENT_ID: z.string().min(1, 'Discord client ID is required'),
  GUILD_ID: z.string().min(1, 'Guild ID is required'),
  WALLET_ADDRESS: z.string().min(32, 'Invalid wallet address').max(44, 'Invalid wallet address'),
  RPC_ENDPOINT: z.string().url('Invalid RPC endpoint').default('https://api.mainnet-beta.solana.com'),
  MIN_SOL_AMOUNT: z.coerce.number().positive('Minimum SOL amount must be positive').default(0.001),
  AUTHORIZED_ROLE_ID: z.string().min(1, 'Authorized role ID is required'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),

  // AWS Configuration (optional for command deployment)
  AWS_KEY: z.string().min(1, 'AWS access key is required').optional(),
  AWS_SECRET: z.string().min(1, 'AWS secret access key is required').optional(),
  REGION: z.string().default('eu-west-3'),

  // DynamoDB Table Names (optional - defaults to solanashares- prefix)
  USER_INVESTMENTS_TABLE: z.string().default('solanashares-UserInvestments'),
  TRANSACTION_CHECKPOINTS_TABLE: z.string().default('solanashares-TransactionCheckpoints'),

  // Role Management Configuration
  FARMER_ROLE_ID: z.string().min(1, 'Farmer role ID is required'),
  FARMER_MIN_SOL_AMOUNT: z.coerce.number().positive('Farmer minimum SOL amount must be positive').default(0.99),

  // Auto-refresh Configuration (optional)
  AUTO_REFRESH_INTERVAL: z.coerce
    .number()
    .min(1000, 'Auto refresh interval must be at least 1 second')
    .default(15 * 60 * 1000), // 15 minutes
  AUTO_REFRESH_STARTUP_DELAY: z.coerce
    .number()
    .min(0, 'Auto refresh startup delay must be non-negative')
    .default(30 * 1000), // 30 seconds
});

export type Config = z.infer<typeof ConfigSchema>;
