import type { Watcher } from '../entities/watcher';

export interface IWatcherRepository {
  save(watcher: Watcher): Promise<void>;
  delete(guildId: string, channelId: string): Promise<void>;
  findByGuildAndChannel(guildId: string, channelId: string): Promise<Watcher | null>;
  listByGuild(guildId: string): Promise<Watcher[]>;
  listFollowed(): Promise<Watcher[]>;
}
