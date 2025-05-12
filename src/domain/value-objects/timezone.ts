const COMMON_TIMEZONES = [
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Europe/Moscow',
  'Asia/Dubai',
  'Asia/Kolkata',
  'Asia/Shanghai',
  'Asia/Tokyo',
  'Asia/Singapore',
  'Asia/Seoul',
  'Australia/Sydney',
  'Australia/Melbourne',
  'America/Los_Angeles',
  'America/Vancouver',
  'America/Denver',
  'America/Chicago',
  'America/New_York',
  'America/Toronto',
  'America/Sao_Paulo',
  'America/Mexico_City',
  'America/Argentina/Buenos_Aires',
  'Africa/Cairo',
  'Africa/Johannesburg',
  'Pacific/Auckland',
  'Pacific/Honolulu',
] as const;

export type Timezone = (typeof COMMON_TIMEZONES)[number];

// biome-ignore lint/complexity/noStaticOnlyClass: <explanation>
export class TimezoneHelper {
  static all(): Timezone[] {
    return [...COMMON_TIMEZONES];
  }

  static default(): Timezone {
    return 'Europe/London';
  }

  static isValid(tz: string): tz is Timezone {
    return (COMMON_TIMEZONES as readonly string[]).includes(tz);
  }
}
