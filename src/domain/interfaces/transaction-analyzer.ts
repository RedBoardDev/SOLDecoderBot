import type { Transaction } from '@schemas/participant.schema.js';
import type { WalletAddress } from '../value-objects/wallet-address.js';

export interface TransactionAnalyzer {
  getRecentTransactions(walletAddress: WalletAddress, limit?: number): Promise<string[]>;
  getAllTransactions(walletAddress: WalletAddress, before?: string, limit?: number): Promise<string[]>;
  analyzeTransaction(signature: string, targetWalletAddress: WalletAddress): Promise<Transaction | null>;
  analyzeAllTransactions(walletAddress: WalletAddress): Promise<Transaction[]>;
}
