import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  DeleteCommand,
  GetCommand,
  PutCommand,
  QueryCommand,
  ScanCommand,
  UpdateCommand,
  BatchWriteCommand,
  type BatchWriteCommandInput,
  type BatchWriteCommandOutput,
  type DeleteCommandInput,
  type DeleteCommandOutput,
  type GetCommandInput,
  type GetCommandOutput,
  type PutCommandInput,
  type PutCommandOutput,
  type QueryCommandInput,
  type QueryCommandOutput,
  type ScanCommandInput,
  type ScanCommandOutput,
  type UpdateCommandInput,
  type UpdateCommandOutput,
} from '@aws-sdk/lib-dynamodb';
import { config } from '@config/env.js';
import { logger } from '@shared/logger.js';

// Ensure credentials are available
if (!config.AWS_KEY || !config.AWS_SECRET) {
  throw new Error('AWS credentials are required but not configured');
}

const client = new DynamoDBClient({
  region: config.REGION,
  credentials: {
    accessKeyId: config.AWS_KEY,
    secretAccessKey: config.AWS_SECRET,
  },
});

const docClient = DynamoDBDocumentClient.from(client, {
  marshallOptions: {
    convertEmptyValues: false,
    removeUndefinedValues: true,
    convertClassInstanceToMap: false,
  },
  unmarshallOptions: {
    wrapNumbers: false,
  },
});

/**
 * Optimized DynamoDB service with consistent error handling and no redundant methods
 */
export default class DynamoService {
  /**
   * Generic method to execute DynamoDB commands with consistent error handling
   */
  private async executeCommand(command: any, operation: string, errorPrefix = operation): Promise<any> {
    try {
      return await docClient.send(command);
    } catch (error) {
      logger.dbError(operation, error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`${errorPrefix}-error: ${errorMessage}`);
    }
  }

  create = async (params: PutCommandInput): Promise<PutCommandOutput> => {
    return this.executeCommand(new PutCommand(params), 'create');
  };

  get = async (params: GetCommandInput): Promise<GetCommandOutput> => {
    return this.executeCommand(new GetCommand(params), 'get');
  };

  update = async (params: UpdateCommandInput): Promise<UpdateCommandOutput> => {
    return this.executeCommand(new UpdateCommand(params), 'update');
  };

  delete = async (params: DeleteCommandInput): Promise<DeleteCommandOutput> => {
    return this.executeCommand(new DeleteCommand(params), 'delete');
  };

  query = async (params: QueryCommandInput): Promise<QueryCommandOutput> => {
    return this.executeCommand(new QueryCommand(params), 'query');
  };

  scan = async (params: ScanCommandInput): Promise<ScanCommandOutput> => {
    return this.executeCommand(new ScanCommand(params), 'scan');
  };

  batchWrite = async (params: BatchWriteCommandInput): Promise<BatchWriteCommandOutput> => {
    return this.executeCommand(new BatchWriteCommand(params), 'batch-write');
  };
}
