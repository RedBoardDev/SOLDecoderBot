import dotenv from 'dotenv';
import path from 'node:path';
import { _dirname } from '../../shared/files';

dotenv.config({ path: path.resolve(_dirname, '../../.env') });

// if (!process.env.DISCORD_TOKEN) {
//   throw new Error('DISCORD_TOKEN must be set in .env');
// }
// if (!process.env.AWS_REGION) {
//   throw new Error('AWS_REGION must be set in .env');
// }
// if (!process.env.AWS_ACCESS_KEY_ID) {
//   throw new Error('AWS_ACCESS_KEY_ID must be set in .env');
// }
// if (!process.env.AWS_SECRET_ACCESS_KEY) {
//   throw new Error('AWS_SECRET_ACCESS_KEY must be set in .env');
// }
// if (!process.env.DYNAMO_TABLE_NAME) {
//   throw new Error('DYNAMO_TABLE_NAME must be set in .env');
// }

export const config = {
  discordToken: process.env.DISCORD_TOKEN ?? '',
  awsRegion: process.env.AWS_REGION ?? '',
  dynamoTableName: process.env.DYNAMODB_TABLE_NAME ?? '',
  awsCredentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID ?? '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? '',
  },
  solanaRpcEndpoint: process.env.SOLANA_RPC_ENDPOINT ?? 'https://api.mainnet-beta.solana.com',
  meteoraProgramId: process.env.METEORA_PROGRAM_ID ?? '',
};
