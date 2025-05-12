import { TimezoneHelper, type Timezone } from '../value-objects/timezone';

export interface GuildSettingsProps {
  guildId: string;
  timezone: Timezone;
}

export class GuildSettings {
  private constructor(private readonly props: GuildSettingsProps) {}

  static create(props: { guildId: string; timezone: string }): GuildSettings {
    if (!TimezoneHelper.isValid(props.timezone)) {
      throw new Error(`Invalid timezone: ${props.timezone}`);
    }
    return new GuildSettings({ guildId: props.guildId, timezone: props.timezone });
  }

  get guildId(): string {
    return this.props.guildId;
  }

  get timezone(): Timezone {
    return this.props.timezone;
  }

  withTimezone(tz: string): GuildSettings {
    if (!TimezoneHelper.isValid(tz)) {
      throw new Error(`Invalid timezone: ${tz}`);
    }
    return new GuildSettings({ guildId: this.props.guildId, timezone: tz });
  }
}
