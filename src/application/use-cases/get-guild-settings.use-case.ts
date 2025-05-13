import type { IGuildSettingsRepository } from '../../domain/interfaces/i-guild-settings-repository';
import type { GuildSettings } from '../../domain/entities/guild-settings';

export class GetGuildSettingsUseCase {
  constructor(private readonly repo: IGuildSettingsRepository) {}

  async execute(guildId: string): Promise<GuildSettings | null> {
    return this.repo.find(guildId);
  }
}
