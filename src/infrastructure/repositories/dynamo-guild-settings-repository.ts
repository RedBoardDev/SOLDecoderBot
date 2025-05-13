import DynamoService from '../services/dynamo-service';
import type { IGuildSettingsRepository } from '../../domain/interfaces/i-guild-settings-repository';
import { GuildSettings, type GuildSettingsItem } from '../../domain/entities/guild-settings';
import { config } from '../config/env';

export class DynamoGuildSettingsRepository implements IGuildSettingsRepository {
  private readonly service = new DynamoService();
  private readonly table = config.aws.tables.settings;

  async create(guildId: string, timezone: string): Promise<void> {
    const item: GuildSettingsItem = { guildId, timezone };
    await this.service.create({
      TableName: this.table,
      Item: item as any,
      ConditionExpression: 'attribute_not_exists(guildId)',
    });
  }

  async patch(params: { guildId: string } & Partial<GuildSettingsItem>): Promise<void> {
    const { guildId, ...rest } = params;
    const setExp: string[] = [];
    const ExpressionAttributeNames: Record<string, string> = {};
    const ExpressionAttributeValues: Record<string, any> = {};

    for (const [key, value] of Object.entries(rest)) {
      if (value !== undefined) {
        const nk = `#${key}`;
        const vk = `:${key}`;
        ExpressionAttributeNames[nk] = key;
        ExpressionAttributeValues[vk] = value;
        setExp.push(`${nk} = ${vk}`);
      }
    }

    const UpdateExpression = setExp.length ? `SET ${setExp.join(', ')}` : '';

    await this.service.update({
      TableName: this.table,
      Key: { guildId },
      UpdateExpression,
      ExpressionAttributeNames: Object.keys(ExpressionAttributeNames).length ? ExpressionAttributeNames : undefined,
      ExpressionAttributeValues: Object.keys(ExpressionAttributeValues).length ? ExpressionAttributeValues : undefined,
    });
  }

  async find(guildId: string): Promise<GuildSettings | null> {
    const resp = await this.service.get({ TableName: this.table, Key: { guildId } });
    if (!resp.Item) return null;
    return GuildSettings.fromItem(resp.Item as GuildSettingsItem);
  }
}
