import { REST, Routes } from 'discord.js';
import { config } from '../src/infrastructure/config/env.js';
import { logger } from '../src/shared/logger.js';
import { data as participantsCommand } from '../src/presentation/commands/participants.js';
import { data as walletCommand } from '../src/presentation/commands/wallet.js';
import { data as depositCommand } from '../src/presentation/commands/deposit.js';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const commands = [
  participantsCommand.toJSON(),
  walletCommand.toJSON(),
  depositCommand.toJSON(),
];

const rest = new REST().setToken(config.DISCORD_TOKEN);

// File to store the hash of deployed commands
const commandsHashFile = path.join(__dirname, '..', '.deployed-commands.json');

function hashCommands(commands: any[]): string {
  return JSON.stringify(commands, null, 2);
}

async function getStoredCommandsHash(): Promise<string | null> {
  try {
    const data = await fs.readFile(commandsHashFile, 'utf8');
    const stored = JSON.parse(data);
    return stored.hash;
  } catch {
    return null;
  }
}

async function saveCommandsHash(hash: string): Promise<void> {
  await fs.writeFile(commandsHashFile, JSON.stringify({ hash, timestamp: Date.now() }, null, 2));
}

async function deployCommands() {
  try {
    // Check for command line arguments
    const args = process.argv.slice(2);
    const force = args.includes('--force') || args.includes('-f') || args.includes('force');

    if (force) {
      logger.info('🔄 Force deployment requested, clearing existing commands...');

      // Delete the hash file to force deployment
      try {
        await fs.unlink(commandsHashFile);
        logger.info('🗑️ Cache file deleted for force deployment');
      } catch {
        // File doesn't exist, that's fine
        logger.debug('Cache file already deleted or doesn\'t exist');
      }

      // Clear all existing guild commands first when forcing
      try {
        logger.info('🧹 Clearing all existing commands...');
        await rest.put(
          Routes.applicationGuildCommands(config.DISCORD_CLIENT_ID, config.GUILD_ID),
          { body: [] }
        );
        logger.info('✅ All existing commands cleared');
      } catch (error) {
        logger.warn('⚠️ Failed to clear existing commands:', error);
      }
    }

    const currentHash = hashCommands(commands);
    const storedHash = await getStoredCommandsHash();

    // Always deploy if force is used, regardless of hash comparison
    if (currentHash === storedHash && !force) {
      logger.info('✅ Commands are up to date, no deployment needed.');
      return;
    }

    logger.info(`🔄 Deploying ${commands.length} command(s) to guild ${config.GUILD_ID}...`);

    // Get existing commands for comparison
    const existingCommands = await rest.get(
      Routes.applicationGuildCommands(config.DISCORD_CLIENT_ID, config.GUILD_ID)
    ) as any[];

    logger.info(`📋 Found ${existingCommands.length} existing command(s)`);

    // Deploy new commands (this will replace all existing commands)
    await rest.put(
      Routes.applicationGuildCommands(config.DISCORD_CLIENT_ID, config.GUILD_ID),
      { body: commands }
    );

    // Save the hash of deployed commands
    await saveCommandsHash(currentHash);

    logger.info(`✅ Successfully deployed ${commands.length} command(s):`);
    commands.forEach((cmd) => {
      logger.info(`   • /${cmd.name} - ${cmd.description}`);
    });

    if (existingCommands.length > commands.length) {
      logger.info(`🧹 Cleaned up ${existingCommands.length - commands.length} old command(s)`);
    } else if (existingCommands.length < commands.length) {
      logger.info(`➕ Added ${commands.length - existingCommands.length} new command(s)`);
    }

  } catch (error) {
    logger.error('❌ Failed to deploy commands:', error);
    process.exit(1);
  }
}

deployCommands();