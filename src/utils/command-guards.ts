import {
  PermissionsBitField,
  type GuildMember,
  type ChatInputCommandInteraction,
  ChannelType,
  type TextChannel,
} from 'discord.js';
import { PermissionError, ChannelError } from './error-handler';
import { logger } from './logger';

/**
 * Ensure the command is being used in a guild
 */
export function requireGuild(interaction: ChatInputCommandInteraction): void {
  if (!interaction.guild || !interaction.guildId) {
    throw new ChannelError('This command must be used in a server.');
  }
}

/**
 * Ensure the command is being used in a text channel
 * @returns The validated text channel
 */
export function requireTextChannel(interaction: ChatInputCommandInteraction): TextChannel {
  requireGuild(interaction);

  const channel = interaction.channel;
  if (!channel || !(channel.type === ChannelType.GuildText)) {
    throw new ChannelError('This command must be used in a text channel.');
  }

  return channel;
}

/**
 * Ensure the user has administrator permissions
 * @returns The member with validated permissions
 */
export function requireAdmin(interaction: ChatInputCommandInteraction): GuildMember {
  requireGuild(interaction);

  const member = interaction.member as GuildMember;
  if (!member.permissions.has(PermissionsBitField.Flags.Administrator)) {
    logger.warn('Permission denied: Admin required', {
      userId: interaction.user.id,
      channelId: interaction.channelId,
      command: interaction.commandName,
    });
    throw new PermissionError('You need Administrator permission to use this command.');
  }

  return member;
}

/**
 * Ensure the user has specific permissions
 * @returns The member with validated permissions
 */
export function requirePermissions(
  interaction: ChatInputCommandInteraction,
  permissions: bigint | bigint[],
): GuildMember {
  requireGuild(interaction);

  const member = interaction.member as GuildMember;
  if (!member.permissions.has(permissions)) {
    const permNames = Array.isArray(permissions)
      ? permissions.map((p) => PermissionsBitField.Flags[p.toString()])
      : [PermissionsBitField.Flags[permissions.toString()]];

    logger.warn('Permission denied', {
      userId: interaction.user.id,
      channelId: interaction.channelId,
      command: interaction.commandName,
      requiredPermissions: permNames,
    });

    throw new PermissionError(`You need the following permissions to use this command: ${permNames.join(', ')}`);
  }

  return member;
}

/**
 * Ensure the bot has required permissions in the channel
 * @returns The bot member with validated permissions
 */
export function requireBotPermissions(
  interaction: ChatInputCommandInteraction,
  permissions: bigint | bigint[],
): GuildMember {
  requireGuild(interaction);

  const botMember = interaction.guild?.members.me;
  if (!botMember) {
    throw new ChannelError('Unable to retrieve bot information.');
  }

  if (!botMember.permissions.has(permissions)) {
    const permNames = Array.isArray(permissions)
      ? permissions.map((p) => PermissionsBitField.Flags[p.toString()])
      : [PermissionsBitField.Flags[permissions.toString()]];

    logger.warn('Bot permission denied', {
      channelId: interaction.channelId,
      command: interaction.commandName,
      requiredPermissions: permNames,
    });

    throw new ChannelError(`Bot needs the following permissions: ${permNames.join(', ')}`);
  }

  return botMember;
}

/**
 * Ensure a parameter is valid
 */
export function requireParameter<T>(value: T | null | undefined, paramName: string): T {
  if (value === null || value === undefined) {
    throw new Error(`Required parameter "${paramName}" is missing`);
  }
  return value;
}

/**
 * Ensure a valid channel within rate limits
 */
export function validateRateLimit(
  interaction: ChatInputCommandInteraction,
  rateMap: Map<string, number>,
  limitMs = 5000,
  errorMessage = 'Please wait before using this command again.',
): void {
  const key = `${interaction.user.id}-${interaction.commandName}`;
  const now = Date.now();
  const lastUsed = rateMap.get(key) || 0;

  if (now - lastUsed < limitMs) {
    throw new Error(errorMessage);
  }

  rateMap.set(key, now);
}
