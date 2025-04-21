interface ChannelSettings {
  image: boolean;
  tag?: { type: 'user' | 'role'; id: string };
}
type GuildConfig = Record<string, ChannelSettings>;
type ConfigFile  = Record<string, GuildConfig>;
