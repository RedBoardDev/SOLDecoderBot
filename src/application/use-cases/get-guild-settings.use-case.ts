import type { IGuildSettingsRepository } from '../../domain/interfaces/i-guild-settings-repository';
import { GuildSettings } from '../../domain/entities/guild-settings';
import { TimezoneHelper } from '../../domain/value-objects/timezone';

export class GetGuildSettingsUseCase {
  constructor(private readonly repo: IGuildSettingsRepository) {}

  async execute(guildId: string): Promise<GuildSettings> {
    let settings = await this.repo.find(guildId);
    if (!settings) {
      settings = GuildSettings.create({ guildId, timezone: TimezoneHelper.default() });
      await this.repo.save(settings);
    }
    return settings;
  }
}
