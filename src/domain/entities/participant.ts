import { ParticipantTransactionSchema, type ParticipantTransaction } from '@schemas/participant.schema.js';
import { DomainError } from '../errors/domain-errors.js';

export class Participant {
  private constructor(
    private readonly _datetime: string,
    private readonly _discordUser: string,
    private readonly _walletAddress: string,
    private readonly _expectedAmount: number,
    private _receivedAmount = 0,
    private _transactions: ParticipantTransaction[] = [],
  ) {
    this.validateInvariants();
  }

  static create(datetime: string, discordUser: string, walletAddress: string, expectedAmount: number): Participant {
    if (!datetime.trim()) throw new DomainError('Datetime is required');
    if (!discordUser.trim()) throw new DomainError('Discord user is required');
    if (!walletAddress.trim() || walletAddress.length < 32) throw new DomainError('Invalid wallet address');
    if (expectedAmount <= 0) throw new DomainError('Expected amount must be positive');

    return new Participant(datetime, discordUser, walletAddress, expectedAmount);
  }

  static restore(
    datetime: string,
    discordUser: string,
    walletAddress: string,
    expectedAmount: number,
    receivedAmount: number,
    transactions: ParticipantTransaction[],
  ): Participant {
    if (receivedAmount < 0) throw new DomainError('Received amount cannot be negative');

    return new Participant(datetime, discordUser, walletAddress, expectedAmount, receivedAmount, transactions);
  }

  get datetime(): string {
    return this._datetime;
  }

  get discordUser(): string {
    return this._discordUser;
  }

  get walletAddress(): string {
    return this._walletAddress;
  }

  get expectedAmount(): number {
    return this._expectedAmount;
  }

  get receivedAmount(): number {
    return this._receivedAmount;
  }

  get transactions(): ParticipantTransaction[] {
    return [...this._transactions];
  }

  addTransaction(signature: string, amount: number, timestamp: number): void {
    if (!signature.trim()) throw new DomainError('Transaction signature is required');
    if (amount <= 0) throw new DomainError('Transaction amount must be positive');
    if (timestamp <= 0) throw new DomainError('Transaction timestamp must be positive');

    // Validate with schema
    const transactionData = ParticipantTransactionSchema.parse({
      signature,
      amount,
      timestamp,
    });

    // Check for duplicate transactions
    const existingTransaction = this._transactions.find((tx) => tx.signature === signature);
    if (existingTransaction) {
      return; // Ignore duplicate transactions
    }

    this._transactions.push(transactionData);
    this._receivedAmount += amount;
    this.validateInvariants();
  }

  isCompleted(): boolean {
    return this._receivedAmount >= this._expectedAmount;
  }

  getCompletionPercentage(): number {
    if (this._expectedAmount === 0) return 0;
    return Math.min((this._receivedAmount / this._expectedAmount) * 100, 100);
  }

  getShortWalletAddress(): string {
    return `${this._walletAddress.slice(0, 4)}...${this._walletAddress.slice(-4)}`;
  }

  private validateInvariants(): void {
    if (this._receivedAmount < 0) {
      throw new DomainError('Received amount cannot be negative');
    }
    if (this._expectedAmount <= 0) {
      throw new DomainError('Expected amount must be positive');
    }
  }
}
