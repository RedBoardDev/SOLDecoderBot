import type { IWalletWatchRepository } from '../../domain/interfaces/i-wallet-watch-repository';
import { WalletWatch, type WalletItem } from '../../domain/entities/wallet-watch';
import DynamoService from '../services/dynamo-service';
import { config } from '../config/env';
import type { Frequency } from '../../domain/value-objects/frequency';

export class DynamoWalletWatchRepository implements IWalletWatchRepository {
  private readonly service = new DynamoService();
  private readonly table = config.aws.tables.wallets;
  private readonly skPrefix = 'WALLET#';

  private buildKey(guildId: string, address: string, channelId: string) {
    return {
      PK: `GUILD#${guildId}`,
      SK: `${this.skPrefix}${address}#CHAN#${channelId}`,
    };
  }

  async create(guildId: string, address: string, channelId: string): Promise<void> {
    const { PK, SK } = this.buildKey(guildId, address, channelId);
    const item: WalletItem = {
      PK,
      SK,
      channelId,
      threshold: 0,
      image: 0,
      pin: 0,
      summaryDaily: 0,
      summaryWeekly: 0,
      summaryMonthly: 0,
      notifyOnClose: 0,
    };
    await this.service.create({
      TableName: this.table,
      Item: item as any,
      ConditionExpression: 'attribute_not_exists(PK) AND attribute_not_exists(SK)',
    });
  }

  async patch(params: { guildId: string; address: string; channelId: string } & Partial<WalletItem>) {
    const { guildId, address, channelId, ...rest } = params;
    const { PK, SK } = this.buildKey(guildId, address, channelId);

    const setExp: string[] = [];
    const removeExp: string[] = [];
    const ExpressionAttributeNames: Record<string, string> = {};
    const ExpressionAttributeValues: Record<string, any> = {};

    for (const [key, value] of Object.entries(rest)) {
      if (value === undefined || value === null) {
        removeExp.push(key);
      } else {
        const nameKey = `#${key}`;
        const valueKey = `:${key}`;
        ExpressionAttributeNames[nameKey] = key;
        ExpressionAttributeValues[valueKey] = value;
        setExp.push(`${nameKey} = ${valueKey}`);
      }
    }

    let UpdateExpression = '';
    if (setExp.length) UpdateExpression += `SET ${setExp.join(', ')}`;
    if (removeExp.length) {
      if (UpdateExpression) UpdateExpression += ' ';
      UpdateExpression += `REMOVE ${removeExp.join(', ')}`;
    }

    await this.service.update({
      TableName: this.table,
      Key: { PK, SK },
      UpdateExpression,
      ExpressionAttributeNames: Object.keys(ExpressionAttributeNames).length > 0 ? ExpressionAttributeNames : undefined,
      ExpressionAttributeValues:
        Object.keys(ExpressionAttributeValues).length > 0 ? ExpressionAttributeValues : undefined,
    });
  }

  async delete(guildId: string, address: string, channelId: string): Promise<void> {
    const { PK, SK } = this.buildKey(guildId, address, channelId);
    await this.service.delete({ TableName: this.table, Key: { PK, SK } });
  }

  private mapItems(items: WalletItem[]): WalletWatch[] {
    return items.map((item) => WalletWatch.fromItem(item));
  }

  private mapItem(item: WalletItem): WalletWatch {
    return WalletWatch.fromItem(item);
  }

  async findByGuildAddressAndChannel(guildId: string, address: string, channelId: string): Promise<WalletWatch | null> {
    const { PK, SK } = this.buildKey(guildId, address, channelId);
    const resp = await this.service.get({ TableName: this.table, Key: { PK, SK } });
    return resp.Item ? WalletWatch.fromItem(resp.Item as WalletItem) : null;
  }

  async listByGuild(guildId: string): Promise<WalletWatch[]> {
    const resp = await this.service.query({
      TableName: this.table,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :prefix)',
      ExpressionAttributeValues: { ':pk': `GUILD#${guildId}`, ':prefix': this.skPrefix },
    });
    return this.mapItems((resp.Items as WalletItem[]) ?? []);
  }

  async listBySummary(f: Frequency): Promise<WalletWatch[]> {
    const index = f === 'DAY' ? 'DailyIndex' : f === 'WEEK' ? 'WeeklyIndex' : 'MonthlyIndex';
    const attr = f === 'DAY' ? 'summaryDaily' : f === 'WEEK' ? 'summaryWeekly' : 'summaryMonthly';
    const resp = await this.service.query({
      TableName: this.table,
      IndexName: index,
      KeyConditionExpression: `${attr} = :v`,
      ExpressionAttributeValues: { ':v': 1 },
    });
    return this.mapItems((resp.Items as WalletItem[]) ?? []);
  }

  public async findByChannelAndWalletPrefixAndNotify(
    channelId: string,
    walletPrefix: string,
  ): Promise<WalletWatch | null> {
    const resp = await this.service.query({
      TableName: this.table,
      IndexName: 'ByChannel',
      KeyConditionExpression: 'channelId = :c AND begins_with(SK, :sk)',
      FilterExpression: 'notifyOnClose = :n',
      ExpressionAttributeValues: {
        ':c': channelId,
        ':sk': `${this.skPrefix}${walletPrefix}`,
        ':n': 1,
      },
      Limit: 1,
    });

    const items = resp.Items as WalletItem[] | undefined;
    if (!items || items.length === 0) return null;

    return this.mapItem(items[0]);
  }
}
