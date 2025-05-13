import type { GuildSettings, GuildSettingsItem } from '../entities/guild-settings';

export interface IGuildSettingsRepository {
  create(guildId: string, timezone: string): Promise<void>;

  patch(params: { guildId: string } & Partial<GuildSettingsItem>): Promise<void>;

  find(guildId: string): Promise<GuildSettings | null>;
}
