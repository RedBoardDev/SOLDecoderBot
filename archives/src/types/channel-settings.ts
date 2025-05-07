export interface ChannelSettings {
  image: boolean;
  tag: { type: 'user' | 'role'; id: string } | false;
}

export type GuildConfig = Record<string, ChannelSettings>;
export type ConfigFile  = Record<string, GuildConfig>;
