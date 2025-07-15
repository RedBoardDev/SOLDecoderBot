import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Client } from 'discord.js';
import { logger } from '@shared/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface Event {
  name: string;
  once?: boolean;
  execute: (...args: any[]) => void;
}

export async function loadEvents(client: Client): Promise<void> {
  const eventsPath = path.join(__dirname, '..', 'events');

  try {
    const eventFiles = await fs.readdir(eventsPath);
    // Look for .ts files since we're using tsx
    const tsFiles = eventFiles.filter((file) => file.endsWith('.ts'));

    for (const file of tsFiles) {
      const filePath = path.join(eventsPath, file);
      const event = (await import(filePath)) as Event;

      if ('name' in event && 'execute' in event) {
        if (event.once) {
          client.once(event.name, (...args) => event.execute(...args));
        } else {
          client.on(event.name, (...args) => event.execute(...args));
        }
        logger.debug(`Event loaded: ${event.name}`);
      } else {
        logger.warn(`Event at ${filePath} missing required name or execute property`);
      }
    }

    logger.info(`Event loader completed: ${tsFiles.length} events loaded`);
  } catch (error) {
    logger.error('Event loading failed', error);
  }
}
