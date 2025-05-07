import { type DynamoDBDocumentClient, GetCommand, PutCommand, DeleteCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import type { IWatcherRepository } from '../../domain/interfaces/i-watcher-repository';
import { Watcher, type TagType } from '../../domain/entities/watcher';
import { Threshold } from '../../domain/value-objects/threshold';
import { config } from '../config/env';

type DynamoWatcherItem = {
  PK: string;
  SK: string;
  threshold: number;
  image: boolean;
  pin: boolean;
  followed: number;
  tagId?: string;
  tagType?: TagType;
};

export class DynamoWatcherRepository implements IWatcherRepository {
  private readonly table = config.dynamoTableName;
  private readonly metaSk = 'META';

  constructor(private readonly docClient: DynamoDBDocumentClient) {}

  async save(w: Watcher): Promise<void> {
    const pk = `GUILD#${w.guildId}#CHANNEL#${w.channelId}`;
    const item: DynamoWatcherItem = {
      PK: pk,
      SK: this.metaSk,
      threshold: w.threshold.value,
      image: w.image,
      pin: w.pin,
      followed: w.followed ? 1 : 0,
      ...(w.tagId && { tagId: w.tagId }),
      ...(w.tagType && { tagType: w.tagType }),
    };
    await this.docClient.send(new PutCommand({ TableName: this.table, Item: item }));
  }

  async delete(guildId: string, channelId: string): Promise<void> {
    const pk = `GUILD#${guildId}#CHANNEL#${channelId}`;
    await this.docClient.send(new DeleteCommand({ TableName: this.table, Key: { PK: pk, SK: this.metaSk } }));
  }

  async findByGuildAndChannel(guildId: string, channelId: string): Promise<Watcher | null> {
    const pk = `GUILD#${guildId}#CHANNEL#${channelId}`;
    const res = await this.docClient.send(new GetCommand({ TableName: this.table, Key: { PK: pk, SK: this.metaSk } }));
    const it = res.Item as DynamoWatcherItem | undefined;
    if (!it) return null;
    return Watcher.create({
      guildId,
      channelId,
      threshold: Threshold.create(it.threshold),
      image: it.image,
      pin: it.pin,
      tagId: it.tagId,
      tagType: it.tagType,
      followed: Boolean(it.followed),
    });
  }

  async listByGuild(guildId: string): Promise<Watcher[]> {
    const prefix = `GUILD#${guildId}#CHANNEL#`;
    const res = await this.docClient.send(
      new ScanCommand({
        TableName: this.table,
        FilterExpression: 'begins_with(PK, :pk) AND SK = :meta',
        ExpressionAttributeValues: { ':pk': prefix, ':meta': this.metaSk },
      }),
    );
    const items = (res.Items as DynamoWatcherItem[]) ?? [];
    return items.map((it) => {
      const channelId = it.PK.split('#').pop()!;
      return Watcher.create({
        guildId,
        channelId,
        threshold: Threshold.create(it.threshold),
        image: it.image,
        pin: it.pin,
        tagId: it.tagId,
        tagType: it.tagType,
        followed: Boolean(it.followed),
      });
    });
  }

  async listFollowed(): Promise<Watcher[]> {
    const res = await this.docClient.send(
      new ScanCommand({
        TableName: this.table,
        FilterExpression: 'followed = :t AND SK = :meta',
        ExpressionAttributeValues: { ':t': 1, ':meta': this.metaSk },
      }),
    );
    const items = (res.Items as DynamoWatcherItem[]) ?? [];
    return items.map((it) => {
      const [_, guildId, __, channelId] = it.PK.split('#');
      return Watcher.create({
        guildId,
        channelId,
        threshold: Threshold.create(it.threshold),
        image: it.image,
        pin: it.pin,
        tagId: it.tagId,
        tagType: it.tagType,
        followed: Boolean(it.followed),
      });
    });
  }
}
