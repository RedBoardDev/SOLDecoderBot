import path from 'node:path';
import dotenv from 'dotenv';
import { z } from 'zod';
import { _dirname } from '../../shared/files';

dotenv.config({ path: path.resolve(_dirname, '../../.env') });

const EnvSchema = z.object({
  // Discord
  DISCORD_TOKEN: z.string().nonempty(),

  // AWS
  AWS_REGION: z.string().nonempty(),
  AWS_ACCESS_KEY_ID: z.string().nonempty(),
  AWS_SECRET_ACCESS_KEY: z.string().nonempty(),

  // DynamoDB table names
  DYNAMODB_SETTINGS_TABLE_NAME: z.string().nonempty(),
  DYNAMODB_WALLETS_TABLE_NAME: z.string().nonempty(),

  // AWS Scheduler role ARN
  // SCHEDULER_ROLE_ARN: z.string().nonempty(),

  // summary Lambda ARN
  // SUMMARY_LAMBDA_ARN: z.string().nonempty(),

  // Solana RPC
  SOLANA_RPC_ENDPOINT: z.string().url().default('https://api.mainnet-beta.solana.com'),

  // Meteora Program
  METEORA_PROGRAM_ID: z.string().nonempty(),
});

const _env = EnvSchema.safeParse(process.env);
if (!_env.success) {
  console.error('❌ Invalid or missing environment variables:', _env.error.format());
  process.exit(1);
}

export const config = {
  discordToken: _env.data.DISCORD_TOKEN,
  aws: {
    region: _env.data.AWS_REGION,
    credentials: {
      accessKeyId: _env.data.AWS_ACCESS_KEY_ID,
      secretAccessKey: _env.data.AWS_SECRET_ACCESS_KEY,
    },
    // schedulerRoleArn: _env.data.SCHEDULER_ROLE_ARN,
    tables: {
      settings: _env.data.DYNAMODB_SETTINGS_TABLE_NAME,
      wallets: _env.data.DYNAMODB_WALLETS_TABLE_NAME,
    },
    lambda: {
      // summaryArn: _env.data.SUMMARY_LAMBDA_ARN,
    },
  },
  solana: {
    rpcEndpoint: _env.data.SOLANA_RPC_ENDPOINT,
    programId: _env.data.METEORA_PROGRAM_ID,
  },
} as const;

export type Config = typeof config;
