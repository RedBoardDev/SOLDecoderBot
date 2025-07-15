import { DomainError } from '../errors/domain-errors.js';
import { UserInvestmentSchema, type UserInvestment as UserInvestmentData } from '@schemas/user-investment.schema.js';

export class UserInvestment {
  private constructor(
    private readonly _discordUserId: string,
    private _walletAddress: string,
    private _investedAmount: number,
    private readonly _createdAt: Date,
    private _updatedAt: Date,
  ) {
    this.validateInvariants();
  }

  static create(discordUserId: string, walletAddress: string, investedAmount = 0): UserInvestment {
    if (!discordUserId.trim()) throw new DomainError('Discord user ID is required');
    if (!walletAddress.trim() || walletAddress.length < 32) throw new DomainError('Invalid wallet address');
    if (investedAmount < 0) throw new DomainError('Invested amount cannot be negative');

    const now = new Date();
    return new UserInvestment(discordUserId, walletAddress, investedAmount, now, now);
  }

  static restore(
    discordUserId: string,
    walletAddress: string,
    investedAmount: number,
    createdAt: Date,
    updatedAt: Date,
  ): UserInvestment {
    if (!discordUserId.trim()) throw new DomainError('Discord user ID is required');
    if (!walletAddress.trim() || walletAddress.length < 32) throw new DomainError('Invalid wallet address');
    if (investedAmount < 0) throw new DomainError('Invested amount cannot be negative');

    return new UserInvestment(discordUserId, walletAddress, investedAmount, createdAt, updatedAt);
  }

  static fromData(data: UserInvestmentData): UserInvestment {
    // Validate data with schema
    const validatedData = UserInvestmentSchema.parse(data);

    return UserInvestment.restore(
      validatedData.userId, // userId est l'équivalent de discordUserId dans DynamoDB
      validatedData.walletAddress,
      validatedData.investedAmount,
      new Date(validatedData.createdAt),
      new Date(validatedData.updatedAt),
    );
  }

  // Getters
  get discordUserId(): string {
    return this._discordUserId;
  }

  get walletAddress(): string {
    return this._walletAddress;
  }

  get investedAmount(): number {
    return this._investedAmount;
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  get updatedAt(): Date {
    return this._updatedAt;
  }

  // Business logic methods
  updateInvestedAmount(newAmount: number): void {
    if (newAmount < 0) throw new DomainError('Invested amount cannot be negative');

    this._investedAmount = newAmount;
    this._updatedAt = new Date();
    this.validateInvariants();
  }

  linkWallet(newWalletAddress: string): void {
    if (!newWalletAddress.trim() || newWalletAddress.length < 32) {
      throw new DomainError('Invalid wallet address');
    }

    this._walletAddress = newWalletAddress;
    this._updatedAt = new Date();
    this.validateInvariants();
  }

  canRefresh(): boolean {
    const now = new Date();
    const oneMinuteAgo = new Date(now.getTime() - 60 * 1000);
    return this._updatedAt <= oneMinuteAgo;
  }

  getTimeSinceLastUpdate(): number {
    return Date.now() - this._updatedAt.getTime();
  }

  isRecentlyUpdated(): boolean {
    const now = new Date();
    const oneMinuteAgo = new Date(now.getTime() - 60 * 1000);
    return this._updatedAt > oneMinuteAgo;
  }

  getShortWalletAddress(): string {
    if (this._walletAddress.length < 8) return this._walletAddress;
    return `${this._walletAddress.slice(0, 4)}...${this._walletAddress.slice(-4)}`;
  }

  // Convert to data format for storage
  toData(): UserInvestmentData {
    return {
      userId: this._discordUserId, // Map discordUserId to userId for DynamoDB
      walletAddress: this._walletAddress,
      investedAmount: this._investedAmount,
      createdAt: this._createdAt.toISOString(),
      updatedAt: this._updatedAt.toISOString(),
    };
  }

  private validateInvariants(): void {
    if (!this._discordUserId.trim()) throw new DomainError('Discord user ID is required');
    if (!this._walletAddress.trim()) throw new DomainError('Wallet address is required');
    if (this._investedAmount < 0) throw new DomainError('Invested amount cannot be negative');
    if (this._createdAt > this._updatedAt) throw new DomainError('Created date cannot be after updated date');
  }
}
