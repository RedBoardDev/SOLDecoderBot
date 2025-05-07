// src/infrastructure/config/aws.ts
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { config } from './env';

const ddb = new DynamoDBClient({
  region: config.awsRegion,
  credentials: config.awsCredentials,
});

export const docClient = DynamoDBDocumentClient.from(ddb, {
  marshallOptions: { removeUndefinedValues: true },
});
