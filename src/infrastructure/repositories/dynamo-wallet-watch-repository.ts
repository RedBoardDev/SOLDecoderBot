import DynamoService from '../services/dynamo-service';
import type { IWalletWatchRepository } from '../../domain/interfaces/i-wallet-watch-repository';
import { WalletWatch } from '../../domain/entities/wallet-watch';
import { Threshold } from '../../domain/value-objects/threshold';
import { config } from '../config/env';

type DynamoItem = {
  PK: string;
  SK: string;
  channelId: string;
  threshold: number;
  image: boolean;
  pin: boolean;
  tagId?: string;
  tagType?: string;
  summaryDaily: number;
  summaryWeekly: number;
  summaryMonthly: number;
  notifyOnClose: number;
};

export class DynamoWalletWatchRepository implements IWalletWatchRepository {
  private readonly service = new DynamoService();
  private readonly table = config.aws.tables.wallets;
  private readonly skPrefix = 'WALLET#';

  async save(w: WalletWatch): Promise<void> {
    const item: DynamoItem = {
      PK: `GUILD#${w.guildId}`,
      SK: `${this.skPrefix}${w.address}#CHAN#${w.channelId}`,
      channelId: w.channelId,
      threshold: w.threshold.value,
      image: w.image,
      pin: w.pin,
      ...(w.tagId && { tagId: w.tagId }),
      ...(w.tagType && { tagType: w.tagType }),
      summaryDaily: w.summaryDaily ? 1 : 0,
      summaryWeekly: w.summaryWeekly ? 1 : 0,
      summaryMonthly: w.summaryMonthly ? 1 : 0,
      notifyOnClose: w.notifyOnClose ? 1 : 0,
    };
    await this.service.create({ TableName: this.table, Item: item as any });
  }

  async delete(guildId: string, address: string, channelId: string): Promise<void> {
    const sk = `${this.skPrefix}${address}#CHAN#${channelId}`;
    await this.service.delete({
      TableName: this.table,
      Key: { PK: `GUILD#${guildId}`, SK: sk },
    });
  }

  private async mapItems(items: DynamoItem[]): Promise<WalletWatch[]> {
    return items.map((i) => {
      const raw = i.SK.slice(this.skPrefix.length);
      const [address, , channelId] = raw.split('#');
      return WalletWatch.create({
        guildId: i.PK.split('#')[1],
        address,
        channelId,
        threshold: Threshold.create(i.threshold),
        image: i.image,
        pin: i.pin,
        tagId: i.tagId,
        tagType: (i.tagType as 'USER' | 'ROLE') ?? undefined,
        summaryDaily: i.summaryDaily === 1,
        summaryWeekly: i.summaryWeekly === 1,
        summaryMonthly: i.summaryMonthly === 1,
        notifyOnClose: i.notifyOnClose === 1,
      });
    });
  }

  async listByNotifyOnClose(): Promise<WalletWatch[]> {
    const resp = await this.service.query({
      TableName: this.table,
      IndexName: 'NotifyOnCloseIndex',
      KeyConditionExpression: 'notifyOnClose = :v',
      ExpressionAttributeValues: { ':v': 1 },
    });
    const items = (resp.Items as unknown as DynamoItem[]) ?? [];
    return this.mapItems(items);
  }

  async listByChannelAndWalletPrefixAndNotify(channelId: string, walletPrefix: string): Promise<WalletWatch[]> {
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
    });
    const items = (resp.Items as unknown as DynamoItem[]) ?? [];
    return this.mapItems(items);
  }

  async findByGuildAndAddress(guildId: string, address: string): Promise<WalletWatch | null> {
    const resp = await this.service.get({
      TableName: this.table,
      Key: { PK: `GUILD#${guildId}`, SK: `${this.skPrefix}${address}` },
    });
    if (!resp.Item) return null;
    const item = resp.Item as unknown as DynamoItem;
    return (await this.mapItems([item]))[0];
  }

  async findByGuildAddressAndChannel(guildId: string, address: string, channelId: string): Promise<WalletWatch | null> {
    const sk = `${this.skPrefix}${address}#CHAN#${channelId}`;
    const resp = await this.service.get({
      TableName: this.table,
      Key: { PK: `GUILD#${guildId}`, SK: sk },
    });
    if (!resp.Item) return null;
    return (await this.mapItems([resp.Item as DynamoItem]))[0];
  }

  async listByGuild(guildId: string): Promise<WalletWatch[]> {
    const resp = await this.service.query({
      TableName: this.table,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :prefix)',
      ExpressionAttributeValues: {
        ':pk': `GUILD#${guildId}`,
        ':prefix': this.skPrefix,
      },
    });
    return this.mapItems((resp.Items as DynamoItem[]) ?? []);
  }

  async listByChannel(channelId: string): Promise<WalletWatch[]> {
    const resp = await this.service.query({
      TableName: this.table,
      IndexName: 'ByChannel',
      KeyConditionExpression: 'channelId = :c',
      ExpressionAttributeValues: { ':c': channelId },
    });
    const items = (resp.Items as unknown as DynamoItem[]) ?? [];
    return this.mapItems(items);
  }

  async listBySummary(f: 'DAY' | 'WEEK' | 'MONTH'): Promise<WalletWatch[]> {
    const index = f === 'DAY' ? 'DailyIndex' : f === 'WEEK' ? 'WeeklyIndex' : 'MonthlyIndex';
    const attr = f === 'DAY' ? 'summaryDaily' : f === 'WEEK' ? 'summaryWeekly' : 'summaryMonthly';
    const resp = await this.service.query({
      TableName: this.table,
      IndexName: index,
      KeyConditionExpression: `${attr} = :v`,
      ExpressionAttributeValues: { ':v': 1 },
    });
    const items = (resp.Items as unknown as DynamoItem[]) ?? [];
    return this.mapItems(items);
  }
}
