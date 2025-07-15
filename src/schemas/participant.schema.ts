import { z } from 'zod';

// Transaction from Solana blockchain
export const TransactionSchema = z.object({
  signature: z.string().min(1, 'Transaction signature is required'),
  solAmount: z.number().positive('SOL amount must be positive'),
  timestamp: z.number().positive('Timestamp must be positive'),
  slot: z.number().positive('Slot must be positive'),
  senderAddress: z.string().nullable(),
});

// Participant transaction (simplified for storage)
export const ParticipantTransactionSchema = z.object({
  signature: z.string(),
  amount: z.number().positive(),
  timestamp: z.number(),
});

// Participant data structure
export const ParticipantDataSchema = z.object({
  datetime: z.string(),
  discordUser: z.string().min(1, 'Discord username is required'),
  walletAddress: z.string().min(32, 'Invalid wallet address').max(44, 'Invalid wallet address'),
  expectedAmount: z.number().positive('Expected amount must be positive'),
  receivedAmount: z.number().min(0, 'Received amount cannot be negative').default(0),
  transactions: z.array(ParticipantTransactionSchema).default([]),
});

// Summary data for use cases
export const ParticipantSummarySchema = z.object({
  participants: z.array(z.any()), // Will be Participant entities
  solPrice: z.number().positive(),
  totalTransactions: z.number().min(0),
  analysisTime: z.number().min(0),
});

// Export types
export type Transaction = z.infer<typeof TransactionSchema>;
export type ParticipantTransaction = z.infer<typeof ParticipantTransactionSchema>;
export type ParticipantData = z.infer<typeof ParticipantDataSchema>;
export type ParticipantSummaryData = z.infer<typeof ParticipantSummarySchema>;
