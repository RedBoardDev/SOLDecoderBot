import { SlashCommandBuilder, ChatInputCommandInteraction, Role, User, GuildMember, SlashCommandBooleanOption, SlashCommandMentionableOption, SlashCommandOptionsOnlyBuilder } from 'discord.js';
import type { ChannelSettings } from '@repositories/channel-repository';

/**
 * Ajoute les options communes (image, tag) à un SlashCommandBuilder ou OptionsOnlyBuilder.
 */
export function addSettingsOptions(builder: SlashCommandBuilder): SlashCommandBuilder;
export function addSettingsOptions(builder: SlashCommandOptionsOnlyBuilder): SlashCommandOptionsOnlyBuilder;
export function addSettingsOptions(builder: any): any {
  return builder
    .addBooleanOption((opt: SlashCommandBooleanOption) =>
      opt
        .setName('image')
        .setDescription('Afficher l’attachement comme image dans le pin')
    )
    .addMentionableOption((opt: SlashCommandMentionableOption) =>
      opt
        .setName('tag')
        .setDescription('Utilisateur ou rôle à mentionner lors du pin')
    );
}

/**
 * Extrait les paramètres fournis par l’utilisateur.
 */
export function getSettingsFromInteraction(
  interaction: ChatInputCommandInteraction
): Partial<ChannelSettings> {
  const img = interaction.options.getBoolean('image');
  const tagMe = interaction.options.getMentionable('tag');
  const settings: Partial<ChannelSettings> = {};

  if (img !== null) {
    settings.image = img;
  }
  if (tagMe) {
    if (tagMe instanceof Role) {
      settings.tag = { type: 'role', id: tagMe.id };
    } else if (tagMe instanceof User || tagMe instanceof GuildMember) {
      settings.tag = { type: 'user', id: tagMe.id };
    }
  }

  return settings;
}

/**
 * Formatte les parties pour le message de confirmation.
 */
export function formatSettingsParts(
  settings: Partial<ChannelSettings>
): string[] {
  const parts: string[] = [];
  if ('image' in settings) {
    parts.push(`Image : ${settings.image}`);
  }
  if (settings.tag) {
    const mention =
      settings.tag.type === 'role'
        ? `<@&${settings.tag.id}>`
        : `<@${settings.tag.id}>`;
    parts.push(`Tag : ${mention}`);
  }
  return parts;
}
