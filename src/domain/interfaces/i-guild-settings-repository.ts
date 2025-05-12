import type { GuildSettings } from '../entities/guild-settings';

export interface IGuildSettingsRepository {
  /** Finds guild settings by guild ID. */
  find(guildId: string): Promise<GuildSettings | null>;

  /** Saves the guild settings. */
  save(settings: GuildSettings): Promise<void>;
}
