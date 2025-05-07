import {
  PermissionsBitField,
  type GuildMember,
  type ChatInputCommandInteraction,
  ChannelType,
  type TextChannel,
} from 'discord.js';
import { PermissionError, ChannelError } from './error-handler';
import { logger } from './logger';

export function requireGuild(interaction: ChatInputCommandInteraction): void {
  if (!interaction.guild || !interaction.guildId) {
    throw new ChannelError('This command must be used in a server.');
  }
}

export function requireTextChannel(interaction: ChatInputCommandInteraction): TextChannel {
  requireGuild(interaction);

  const channel = interaction.channel;
  if (!channel || !(channel.type === ChannelType.GuildText)) {
    throw new ChannelError('This command must be used in a text channel.');
  }

  return channel;
}

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

export function requirePermissions(
  interaction: ChatInputCommandInteraction,
  permissions: bigint | bigint[],
): GuildMember {
  requireGuild(interaction);

  const member = interaction.member as GuildMember;
  if (!member.permissions.has(permissions)) {
    const permNames = Array.isArray(permissions)
      ? permissions.map((p) => {
          const flag = Object.entries(PermissionsBitField.Flags).find(([_, value]) => value === p);
          return flag ? flag[0] : 'Unknown Permission';
        })
      : [
          Object.entries(PermissionsBitField.Flags).find(([_, value]) => value === permissions)?.[0] ??
            'Unknown Permission',
        ];

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
      ? permissions.map((p) => {
          const flag = Object.entries(PermissionsBitField.Flags).find(([_, value]) => value === p);
          return flag ? flag[0] : 'Unknown Permission';
        })
      : [
          Object.entries(PermissionsBitField.Flags).find(([_, value]) => value === permissions)?.[0] ??
            'Unknown Permission',
        ];

    logger.warn('Bot permission denied', {
      channelId: interaction.channelId,
      command: interaction.commandName,
      requiredPermissions: permNames,
    });

    throw new ChannelError(`Bot needs the following permissions: ${permNames.join(', ')}`);
  }

  return botMember;
}

export function requireParameter<T>(value: T | null | undefined, paramName: string): T {
  if (value === null || value === undefined) {
    throw new Error(`Required parameter "${paramName}" is missing`);
  }
  return value;
}

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
