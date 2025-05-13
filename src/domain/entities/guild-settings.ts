import { TimezoneHelper, type Timezone } from '../value-objects/timezone';

export interface GuildSettingsAttributes {
  timezone: Timezone;
}

export interface GuildSettingsItem {
  guildId: string;
  timezone: string;
}

export interface GuildSettingsProps extends GuildSettingsAttributes {
  guildId: string;
}

export class GuildSettings {
  private props: GuildSettingsProps;

  private constructor(props: GuildSettingsProps) {
    if (!TimezoneHelper.isValid(props.timezone)) {
      throw new Error(`Invalid timezone: ${props.timezone}`);
    }
    this.props = { ...props };
  }

  static create(props: { guildId: string; timezone: string }): GuildSettings {
    return new GuildSettings({ guildId: props.guildId, timezone: props.timezone as Timezone });
  }

  static fromItem(item: GuildSettingsItem): GuildSettings {
    return new GuildSettings({ guildId: item.guildId, timezone: item.timezone as Timezone });
  }

  toItem(): GuildSettingsItem {
    return {
      guildId: this.props.guildId,
      timezone: this.props.timezone,
    };
  }

  getIdentifiers(): { guildId: string } {
    return { guildId: this.props.guildId };
  }

  toPatch<K extends keyof Omit<GuildSettingsItem, 'guildId'>>(
    fields: K[],
  ): Pick<GuildSettingsItem, K> & { guildId: string } {
    const { guildId } = this.getIdentifiers();
    const patch: any = { guildId };
    for (const f of fields) {
      patch[f] = (this.props as any)[f];
    }
    return patch;
  }

  get guildId(): string {
    return this.props.guildId;
  }
  get timezone(): Timezone {
    return this.props.timezone;
  }

  setTimezone(tz: Timezone): Timezone {
    if (!TimezoneHelper.isValid(tz)) {
      throw new Error(`Invalid timezone: ${tz}`);
    }
    this.props.timezone = tz;
    return tz;
  }
}
