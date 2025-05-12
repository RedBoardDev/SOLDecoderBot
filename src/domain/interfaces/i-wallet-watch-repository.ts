import type { WalletWatch } from '../entities/wallet-watch';

export interface IWalletWatchRepository {
  /**
   * Creates or updates a watch.
   */
  save(w: WalletWatch): Promise<void>;

  /**
   * Deletes the watch for the pair (guildId, address, channelId).
   */
  delete(guildId: string, address: string, channelId: string): Promise<void>;

  /**
   * Finds a specific watch by guildId, address, and channelId.
   */
  findByGuildAddressAndChannel(guildId: string, address: string, channelId: string): Promise<WalletWatch | null>;

  /**
   * Lists all watches for a guild.
   */
  listByGuild(guildId: string): Promise<WalletWatch[]>;

  /**
   * Lists all watches for a channel (across all wallets).
   */
  listByChannel(channelId: string): Promise<WalletWatch[]>;

  /**
   * Lists all watches for a summary frequency.
   */
  listBySummary(frequency: 'DAY' | 'WEEK' | 'MONTH'): Promise<WalletWatch[]>;

  /**
   * Lists all watches where notifyOnClose = true.
   */
  listByNotifyOnClose(): Promise<WalletWatch[]>;

  /**
   * Finds all watches in a given channel,
   * where notifyOnClose = true and the address starts with walletPrefix.
   */
  listByChannelAndWalletPrefixAndNotify(channelId: string, walletPrefix: string): Promise<WalletWatch[]>;
}
