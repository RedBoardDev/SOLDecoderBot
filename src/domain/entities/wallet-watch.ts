export interface WalletAttributes {
  channelId: string;
  threshold: number;
  image: boolean;
  pin: boolean;
  tagId?: string | null;
  tagType?: 'USER' | 'ROLE' | null;
  summaryDaily: boolean;
  summaryWeekly: boolean;
  summaryMonthly: boolean;
  notifyOnClose: boolean;
}

export interface WalletItem {
  PK: string;
  SK: string;
  channelId: string;
  threshold: number;
  image: 0 | 1;
  pin: 0 | 1;
  tagId?: string;
  tagType?: 'USER' | 'ROLE';
  summaryDaily: 0 | 1;
  summaryWeekly: 0 | 1;
  summaryMonthly: 0 | 1;
  notifyOnClose: 0 | 1;
}

export interface WalletEntityProps extends WalletAttributes {
  guildId: string;
  address: string;
}

export class WalletWatch {
  private props: WalletEntityProps;

  constructor(props: WalletEntityProps) {
    if (!props.address.trim()) throw new Error('Wallet address cannot be empty');
    this.props = { ...props };
  }

  static fromItem(item: WalletItem): WalletWatch {
    const guildId = item.PK.split('#')[1];
    const raw = item.SK.slice('WALLET#'.length);
    const [address, , channelId] = raw.split('#');
    return new WalletWatch({
      guildId,
      address,
      channelId: item.channelId,
      threshold: item.threshold,
      image: item.image === 1,
      pin: item.pin === 1,
      tagId: item.tagId ?? null,
      tagType: item.tagType ?? null,
      summaryDaily: item.summaryDaily === 1,
      summaryWeekly: item.summaryWeekly === 1,
      summaryMonthly: item.summaryMonthly === 1,
      notifyOnClose: item.notifyOnClose === 1,
    });
  }

  toItem(): WalletItem {
    const {
      guildId,
      address,
      channelId,
      threshold,
      image,
      pin,
      tagId,
      tagType,
      summaryDaily,
      summaryWeekly,
      summaryMonthly,
      notifyOnClose,
    } = this.props;

    const base: any = {
      PK: `GUILD#${guildId}`,
      SK: `WALLET#${address}#CHAN#${channelId}`,
      channelId,
      threshold,
      image: image ? 1 : 0,
      pin: pin ? 1 : 0,
      summaryDaily: summaryDaily ? 1 : 0,
      summaryWeekly: summaryWeekly ? 1 : 0,
      summaryMonthly: summaryMonthly ? 1 : 0,
      notifyOnClose: notifyOnClose ? 1 : 0,
    };
    if (tagId != null) base.tagId = tagId;
    if (tagType != null) base.tagType = tagType;
    return base as WalletItem;
  }

  getIdentifiers(): { guildId: string; address: string; channelId: string } {
    const { guildId, address, channelId } = this.props;
    return { guildId, address, channelId };
  }

  toPatch<K extends Exclude<keyof WalletItem, 'PK' | 'SK'>>(
    fields: K[],
  ): Pick<WalletItem, K> & {
    guildId: string;
    address: string;
    channelId: string;
  } {
    const { guildId, address, channelId } = this.getIdentifiers();
    const patch: any = { guildId, address, channelId };
    for (const f of fields) {
      const v = (this.props as any)[f];
      patch[f] = typeof v === 'boolean' ? (v ? 1 : 0) : v;
    }
    return patch;
  }

  get guildId(): string {
    return this.props.guildId;
  }
  get address(): string {
    return this.props.address;
  }
  get channelId(): string {
    return this.props.channelId;
  }
  get threshold(): number {
    return this.props.threshold;
  }
  get image(): boolean {
    return this.props.image;
  }
  get pin(): boolean {
    return this.props.pin;
  }
  get tagId(): string | null | undefined {
    return this.props.tagId;
  }
  get tagType(): 'USER' | 'ROLE' | null | undefined {
    return this.props.tagType;
  }
  get summaryDaily(): boolean {
    return this.props.summaryDaily;
  }
  get summaryWeekly(): boolean {
    return this.props.summaryWeekly;
  }
  get summaryMonthly(): boolean {
    return this.props.summaryMonthly;
  }
  get notifyOnClose(): boolean {
    return this.props.notifyOnClose;
  }

  setThreshold(v: number): number {
    if (!Number.isFinite(v) || v < 0 || v > 100) {
      throw new Error(`Threshold must be between 0 and 100; got ${v}`);
    }
    this.props.threshold = v;
    return v;
  }

  toggleImage(): boolean {
    this.props.image = !this.props.image;
    return this.props.image;
  }

  togglePin(): boolean {
    this.props.pin = !this.props.pin;
    return this.props.pin;
  }

  toggleNotify(): boolean {
    this.props.notifyOnClose = !this.props.notifyOnClose;
    return this.props.notifyOnClose;
  }

  setSummary(freq: 'DAY' | 'WEEK' | 'MONTH', enabled: boolean): boolean {
    switch (freq) {
      case 'DAY':
        this.props.summaryDaily = enabled;
        return enabled;
      case 'WEEK':
        this.props.summaryWeekly = enabled;
        return enabled;
      case 'MONTH':
        this.props.summaryMonthly = enabled;
        return enabled;
    }
  }

  setTag(id: string, type: 'USER' | 'ROLE'): { tagId: string; tagType: 'USER' | 'ROLE' } {
    this.props.tagId = id;
    this.props.tagType = type;
    return { tagId: id, tagType: type };
  }

  clearTag(): { tagId: null; tagType: null } {
    this.props.tagId = null;
    this.props.tagType = null;
    return { tagId: null, tagType: null };
  }
}
