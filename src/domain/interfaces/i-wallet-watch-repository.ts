import type { WalletWatch, WalletItem } from '../entities/wallet-watch';

export interface IWalletWatchRepository {
  create(guildId: string, address: string, channelId: string): Promise<void>;

  patch(params: { guildId: string; address: string; channelId: string } & Partial<WalletItem>): Promise<void>;

  delete(guildId: string, address: string, channelId: string): Promise<void>;

  findByGuildAddressAndChannel(guildId: string, address: string, channelId: string): Promise<WalletWatch | null>;

  listByGuild(guildId: string): Promise<WalletWatch[]>;
  findByChannelAndWalletPrefixAndNotify(channelId: string, walletPrefix: string): Promise<WalletWatch | null>;
}
