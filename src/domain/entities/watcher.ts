import type { Threshold } from '../value-objects/threshold';

export type TagType = 'USER' | 'ROLE';

export interface WatcherProps {
  guildId: string;
  channelId: string;
  threshold: Threshold;
  image: boolean;
  pin: boolean;
  tagId?: string;
  tagType?: TagType;
  followed: boolean;
}

export class Watcher {
  private constructor(private readonly props: WatcherProps) {}

  static create(props: {
    guildId: string;
    channelId: string;
    threshold: Threshold;
    image?: boolean;
    pin?: boolean;
    tagId?: string;
    tagType?: TagType;
    followed?: boolean;
  }): Watcher {
    return new Watcher({
      guildId: props.guildId,
      channelId: props.channelId,
      threshold: props.threshold,
      image: props.image ?? false,
      pin: props.pin ?? false,
      tagId: props.tagId,
      tagType: props.tagType,
      followed: props.followed ?? true,
    });
  }

  get guildId(): string {
    return this.props.guildId;
  }

  get channelId(): string {
    return this.props.channelId;
  }

  get threshold(): Threshold {
    return this.props.threshold;
  }

  get image(): boolean {
    return this.props.image;
  }

  get pin(): boolean {
    return this.props.pin;
  }

  get tagId(): string | undefined {
    return this.props.tagId;
  }

  get tagType(): TagType | undefined {
    return this.props.tagType;
  }

  get followed(): boolean {
    return this.props.followed;
  }

  withThreshold(threshold: Threshold): Watcher {
    return Watcher.create({ ...this.props, threshold });
  }

  toggleImage(): Watcher {
    return Watcher.create({ ...this.props, image: !this.props.image });
  }

  togglePin(): Watcher {
    return Watcher.create({ ...this.props, pin: !this.props.pin });
  }

  withTag(tagId: string, tagType: TagType): Watcher {
    return Watcher.create({ ...this.props, tagId, tagType });
  }

  clearTag(): Watcher {
    const { guildId, channelId, threshold, image, pin, followed } = this.props;
    return Watcher.create({ guildId, channelId, threshold, image, pin, followed });
  }
}
