import DynamoService from '../services/dynamo-service';
import type { IGuildSettingsRepository } from '../../domain/interfaces/i-guild-settings-repository';
import { GuildSettings } from '../../domain/entities/guild-settings';
import { config } from '../config/env';

type DynamoItem = {
  guildId: string;
  timezone: string;
};

export class DynamoGuildSettingsRepository implements IGuildSettingsRepository {
  private readonly service = new DynamoService();
  private readonly table = config.aws.tables.settings;

  async find(guildId: string): Promise<GuildSettings | null> {
    try {
      const resp = await this.service.get({
        TableName: this.table,
        Key: { guildId },
      });
      if (!resp.Item) return null;

      const item = resp.Item as unknown as DynamoItem;
      return GuildSettings.create({ guildId: item.guildId, timezone: item.timezone });
    } catch (err: unknown) {
      console.warn('DynamoGuildSettingsRepository.find warning, returning null:', err);
      return null;
    }
  }

  async save(settings: GuildSettings): Promise<void> {
    const item: DynamoItem = {
      guildId: settings.guildId,
      timezone: settings.timezone,
    };
    await this.service.create({
      TableName: this.table,
      Item: item as unknown as Record<string, any>,
    });
  }
}
