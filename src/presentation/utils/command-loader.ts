import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Collection, type Client } from 'discord.js';
import { logger } from '@shared/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface Command {
  data: any;
  execute: (interaction: any) => Promise<void>;
}

export async function loadCommands(client: Client): Promise<Collection<string, Command>> {
  const commands = new Collection<string, Command>();
  const commandsPath = path.join(__dirname, '..', 'commands');

  try {
    const commandFiles = await fs.readdir(commandsPath);
    // Look for .ts files since we're using tsx
    const tsFiles = commandFiles.filter((file) => file.endsWith('.ts'));

    for (const file of tsFiles) {
      const filePath = path.join(commandsPath, file);
      const command = (await import(filePath)) as Command;

      if ('data' in command && 'execute' in command) {
        commands.set(command.data.name, command);
        logger.debug(`Command loaded: ${command.data.name}`);
      } else {
        logger.warn(`Command at ${filePath} missing required data or execute property`);
      }
    }

    logger.info(`Command loader completed: ${commands.size} commands loaded`);
    return commands;
  } catch (error) {
    logger.error('Command loading failed', error);
    return commands;
  }
}
