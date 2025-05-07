import type { Wallet } from '../entities/wallet';
import type { Frequency } from '../value-objects/frequency';

export interface IWalletRepository {
  save(wallet: Wallet): Promise<void>;
  delete(guildId: string, address: string): Promise<void>;
  findByGuildAndAddress(guildId: string, address: string): Promise<Wallet | null>;
  listByGuild(guildId: string): Promise<Wallet[]>;
  listByFrequency(frequency: Frequency): Promise<Wallet[]>;
}
