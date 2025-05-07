import { logger } from './logger';
import type { CommandInteraction, Message } from 'discord.js';

export class DiscordBotError extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class PermissionError extends DiscordBotError {
  constructor(message = 'You do not have the required permissions for this action') {
    super(message);
  }
}

export class CommandError extends DiscordBotError {
  constructor(message = 'Error executing command') {
    super(message);
  }
}

export class ChannelError extends DiscordBotError {
  constructor(message = 'Invalid channel or missing channel permissions') {
    super(message);
  }
}

export class MessageError extends DiscordBotError {
  constructor(message = 'Error processing message') {
    super(message);
  }
}

export class ApiError extends DiscordBotError {
  constructor(message = 'Error communicating with external API') {
    super(message);
  }
}

export class DatabaseError extends DiscordBotError {
  constructor(message = 'Database operation failed') {
    super(message);
  }
}

export async function handleCommandError(error: unknown, interaction: CommandInteraction): Promise<void> {
  logError('Command execution error', error, {
    commandName: interaction.commandName,
    channelId: interaction.channelId,
    userId: interaction.user.id,
  });

  let userMessage = 'An unexpected error occurred. Please try again later.';

  if (error instanceof DiscordBotError) {
    userMessage = error.message;
  } else if (error instanceof Error) {
    logger.error(`Unhandled error type: ${error.name}`, error);
  } else {
    logger.error('Unknown error type', new Error('Unknown error structure'));
  }

  try {
    if (interaction.deferred) {
      await interaction.editReply({ content: userMessage });
    } else if (!interaction.replied) {
      await interaction.reply({ content: userMessage, ephemeral: true });
    }
  } catch (replyError) {
    logger.error('Failed to send error response to user', replyError as Error);
  }
}

export async function handleMessageError(error: unknown, message: Message): Promise<void> {
  logError('Message processing error', error, {
    channelId: message.channelId,
    messageId: message.id,
    userId: message.author.id,
  });
}

export function logError(context: string, error: unknown, metadata?: Record<string, unknown>): void {
  if (error instanceof Error) {
    logger.error(context, error, metadata);
  } else if (typeof error === 'string') {
    logger.error(context, new Error(error), metadata);
  } else {
    logger.error(context, new Error('Unknown error type'), { ...metadata, rawError: error });
  }
}

export function safeStringify(obj: unknown): string {
  try {
    const cache = new Set();
    return JSON.stringify(obj, (key, value) => {
      if (typeof value === 'object' && value !== null) {
        if (cache.has(value)) {
          return '[Circular Reference]';
        }
        cache.add(value);
      }
      return value;
    });
  } catch (error) {
    return `[Error serializing object: ${(error as Error).message}]`;
  }
}
