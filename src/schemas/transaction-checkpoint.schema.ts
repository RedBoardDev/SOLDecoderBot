import { z } from 'zod';

// Transaction checkpoint data structure for DynamoDB
export const TransactionCheckpointSchema = z.object({
  walletAddress: z.string().min(32, 'Invalid wallet address').max(44, 'Invalid wallet address'),
  lastProcessedSignature: z.string().min(1, 'Last processed signature is required'),
  lastProcessedTimestamp: z.number().positive('Last processed timestamp must be positive'),
  updatedAt: z.string().datetime('Invalid updatedAt format'),
});

// For updating checkpoints
export const TransactionCheckpointUpdateSchema = z.object({
  walletAddress: z.string().min(32, 'Invalid wallet address').max(44, 'Invalid wallet address'),
  lastProcessedSignature: z.string().min(1, 'Last processed signature is required'),
  lastProcessedTimestamp: z.number().positive('Last processed timestamp must be positive'),
  updatedAt: z.string().datetime('Invalid updatedAt format'),
});

// Export types
export type TransactionCheckpoint = z.infer<typeof TransactionCheckpointSchema>;
export type TransactionCheckpointUpdate = z.infer<typeof TransactionCheckpointUpdateSchema>;
