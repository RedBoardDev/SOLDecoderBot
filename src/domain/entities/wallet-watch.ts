import type { Frequency } from '../value-objects/frequency';
import { Threshold } from '../value-objects/threshold';

export interface WalletWatchProps {
  guildId: string;
  address: string;
  channelId: string;
  threshold: Threshold;
  image: boolean;
  pin: boolean;
  tagId?: string;
  tagType?: 'USER' | 'ROLE';
  summaryDaily: boolean;
  summaryWeekly: boolean;
  summaryMonthly: boolean;
  notifyOnClose: boolean;
}

export class WalletWatch {
  private constructor(private readonly props: WalletWatchProps) {}

  static create(props: {
    guildId: string;
    address: string;
    channelId: string;
    threshold?: Threshold;
    image?: boolean;
    pin?: boolean;
    tagId?: string;
    tagType?: 'USER' | 'ROLE';
    summaryDaily?: boolean;
    summaryWeekly?: boolean;
    summaryMonthly?: boolean;
    notifyOnClose: boolean;
  }): WalletWatch {
    if (!props.address.trim()) {
      throw new Error('Wallet address cannot be empty');
    }
    return new WalletWatch({
      guildId: props.guildId,
      address: props.address,
      channelId: props.channelId,
      threshold: props.threshold ?? Threshold.create(0),
      image: props.image ?? false,
      pin: props.pin ?? false,
      tagId: props.tagId,
      tagType: props.tagType,
      summaryDaily: props.summaryDaily ?? false,
      summaryWeekly: props.summaryWeekly ?? false,
      summaryMonthly: props.summaryMonthly ?? false,
      notifyOnClose: props.notifyOnClose ?? false,
    });
  }

  get guildId() {
    return this.props.guildId;
  }
  get address() {
    return this.props.address;
  }
  get channelId() {
    return this.props.channelId;
  }
  get threshold() {
    return this.props.threshold;
  }
  get image() {
    return this.props.image;
  }
  get pin() {
    return this.props.pin;
  }
  get tagId() {
    return this.props.tagId;
  }
  get tagType() {
    return this.props.tagType;
  }
  get summaryDaily() {
    return this.props.summaryDaily;
  }
  get summaryWeekly() {
    return this.props.summaryWeekly;
  }
  get summaryMonthly() {
    return this.props.summaryMonthly;
  }

  withThreshold(threshold: Threshold): WalletWatch {
    return WalletWatch.create({ ...this.props, threshold });
  }

  toggleImage(): WalletWatch {
    return WalletWatch.create({ ...this.props, image: !this.props.image });
  }

  togglePin(): WalletWatch {
    return WalletWatch.create({ ...this.props, pin: !this.props.pin });
  }

  withTag(tagId: string, tagType: 'USER' | 'ROLE'): WalletWatch {
    return WalletWatch.create({ ...this.props, tagId, tagType });
  }

  clearTag(): WalletWatch {
    return WalletWatch.create({
      ...this.props,
      tagId: undefined,
      tagType: undefined,
    });
  }

  withChannel(channelId: string): WalletWatch {
    return WalletWatch.create({ ...this.props, channelId });
  }

  get notifyOnClose(): boolean {
    return this.props.notifyOnClose;
  }
  toggleNotify(): WalletWatch {
    return WalletWatch.create({ ...this.props, notifyOnClose: !this.props.notifyOnClose });
  }

  withSummary(f: Frequency, enabled: boolean): WalletWatch {
    let { summaryDaily, summaryWeekly, summaryMonthly } = this.props;
    switch (f) {
      case 'DAY':
        summaryDaily = enabled;
        break;
      case 'WEEK':
        summaryWeekly = enabled;
        break;
      case 'MONTH':
        summaryMonthly = enabled;
        break;
    }
    return WalletWatch.create({
      ...this.props,
      summaryDaily,
      summaryWeekly,
      summaryMonthly,
    });
  }
}
