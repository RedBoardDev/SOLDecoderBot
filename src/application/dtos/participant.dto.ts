export interface ParticipantDto {
  datetime: string;
  discordUser: string;
  walletAddress: string;
  expectedAmount: number;
  receivedAmount: number;
  transactions: TransactionDto[];
  isCompleted: boolean;
  completionPercentage: number;
}

export interface TransactionDto {
  signature: string;
  amount: number;
  timestamp: number;
}

export interface CompletionStatsDto {
  completed: number;
  total: number;
  percentage: string;
  totalExpected: number;
  totalReceived: number;
}
