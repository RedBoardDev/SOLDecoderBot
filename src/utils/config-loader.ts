import fs from 'node:fs';
import path from 'node:path';

export interface Config {
  matchPrefixes: string[];
}

const configFile: string = path.join(__dirname, '../../config.json');

export function loadConfig(): Config {
  if (!fs.existsSync(configFile)) {
    throw new Error('Fichier config.json introuvable. Veuillez créer un fichier config.json valide.');
  }
  const data = fs.readFileSync(configFile, 'utf8');
  const config: unknown = JSON.parse(data);
  if (!isValidConfig(config)) {
    throw new Error('Config invalide : matchPrefixes doit être un tableau de chaînes.');
  }
  return config;
}

function isValidConfig(config: unknown): config is Config {
  return (
    typeof config === 'object' &&
    config !== null &&
    'matchPrefixes' in config &&
    Array.isArray((config as Config).matchPrefixes) &&
    (config as Config).matchPrefixes.every((prefix) => typeof prefix === 'string')
  );
}
