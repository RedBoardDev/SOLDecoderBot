import type { IGuildSettingsRepository } from '../../domain/interfaces/i-guild-settings-repository';
import { TimezoneHelper } from '../../domain/value-objects/timezone';

export class InitGuildSettingsUseCase {
  constructor(private readonly repo: IGuildSettingsRepository) {}

  async execute(guildId: string): Promise<void> {
    await this.repo.create(guildId, TimezoneHelper.default());
  }
}
