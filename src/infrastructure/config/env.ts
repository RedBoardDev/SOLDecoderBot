import 'dotenv/config';
import { ConfigSchema, type Config } from '@schemas/config.schema.js';

function loadConfig(): Config {
  try {
    const config = ConfigSchema.parse(process.env);
    return config;
  } catch (error) {
    console.error('Invalid environment configuration:', error);
    console.error('Using fallback configuration to prevent bot crash...');
    process.exit(1);
  }
}

export const config = loadConfig();
export type { Config };
