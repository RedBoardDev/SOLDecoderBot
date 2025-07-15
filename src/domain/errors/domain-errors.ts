export class DomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DomainError';
  }
}

export class InvalidWalletAddressError extends DomainError {
  constructor(address: string) {
    super(`Invalid wallet address: ${address}`);
    this.name = 'InvalidWalletAddressError';
  }
}

export class ParticipantNotFoundError extends DomainError {
  constructor(walletAddress: string) {
    super(`Participant not found for wallet address: ${walletAddress}`);
    this.name = 'ParticipantNotFoundError';
  }
}

export class TransactionAnalysisError extends DomainError {
  constructor(signature: string, originalError?: Error) {
    super(`Failed to analyze transaction ${signature}: ${originalError?.message || 'Unknown error'}`);
    this.name = 'TransactionAnalysisError';
  }
}
