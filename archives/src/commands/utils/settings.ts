import type { ChannelSettings } from '@type/channel-settings';
import type {
  SlashCommandBuilder,
  SlashCommandOptionsOnlyBuilder,
  SlashCommandBooleanOption,
  SlashCommandStringOption,
  ChatInputCommandInteraction,
} from 'discord.js';

/**
 * Ajoute les options communes (image, tag).
 * - tag: soit mention, soit 'false'
 */
export function addSettingsOptions(builder: SlashCommandBuilder): SlashCommandBuilder;
export function addSettingsOptions(builder: SlashCommandOptionsOnlyBuilder): SlashCommandOptionsOnlyBuilder;
export function addSettingsOptions(builder: any): any {
  return builder
    .addBooleanOption((opt: SlashCommandBooleanOption) =>
      opt.setName('image').setDescription('Display as embedded image'),
    )
    .addStringOption((opt: SlashCommandStringOption) =>
      opt.setName('tag').setDescription("User/role mention, or 'false' to remove"),
    );
}

/**
 * Extracts settings from interaction.
 */
export function getSettingsFromInteraction(interaction: ChatInputCommandInteraction): Partial<ChannelSettings> {
  const img = interaction.options.getBoolean('image');
  const tagRaw = interaction.options.getString('tag');
  const settings: Partial<ChannelSettings> = {};

  if (img !== null) {
    settings.image = img;
  }
  if (tagRaw !== null) {
    if (tagRaw.toLowerCase() === 'false') {
      settings.tag = false;
    } else {
      // <@123> or <@&456>
      const mUser = tagRaw.match(/^<@!(\d+)>$/) || tagRaw.match(/^<@(\d+)>$/);
      const mRole = tagRaw.match(/^<@&(\d+)>$/);
      if (mRole) {
        settings.tag = { type: 'role', id: mRole[1] };
      } else if (mUser) {
        settings.tag = { type: 'user', id: mUser[1] };
      }
    }
  }

  return settings;
}

/**
 * Formats image & tag for display.
 */
export function formatSettingsParts(settings: Partial<ChannelSettings>): string[] {
  const parts: string[] = [];
  if ('image' in settings) {
    parts.push(`Image: ${settings.image}`);
  }
  if ('tag' in settings) {
    parts.push(
      settings.tag
        ? `Tag: ${settings.tag.type === 'role' ? `<@&${settings.tag.id}>` : `<@${settings.tag.id}>`}`
        : 'Tag: false',
    );
  }
  return parts;
}
