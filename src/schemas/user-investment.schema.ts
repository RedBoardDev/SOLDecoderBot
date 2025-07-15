import { z } from 'zod';

// User investment data structure for DynamoDB
export const UserInvestmentSchema = z.object({
  userId: z.string().min(1, 'User ID is required'), // DynamoDB primary key
  walletAddress: z.string().min(32, 'Invalid wallet address').max(44, 'Invalid wallet address'),
  investedAmount: z.number().min(0, 'Invested amount cannot be negative').default(0),
  createdAt: z.string().datetime('Invalid createdAt format'),
  updatedAt: z.string().datetime('Invalid updatedAt format'),
  refreshStatus: z.string().default('ACTIVE'), // For GSI optimization (always "ACTIVE")
});

// For DynamoDB operations
export const UserInvestmentUpdateSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  walletAddress: z.string().min(32, 'Invalid wallet address').max(44, 'Invalid wallet address').optional(),
  investedAmount: z.number().min(0, 'Invested amount cannot be negative').optional(),
  updatedAt: z.string().datetime('Invalid updatedAt format'),
});

// For creating new investment records
export const CreateUserInvestmentSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  walletAddress: z.string().min(32, 'Invalid wallet address').max(44, 'Invalid wallet address'),
  investedAmount: z.number().min(0, 'Invested amount cannot be negative').default(0),
});

// Export types
export type UserInvestment = z.infer<typeof UserInvestmentSchema>;
export type UserInvestmentUpdate = z.infer<typeof UserInvestmentUpdateSchema>;
export type CreateUserInvestment = z.infer<typeof CreateUserInvestmentSchema>;
export type UserInvestmentData = z.infer<typeof UserInvestmentSchema>;
