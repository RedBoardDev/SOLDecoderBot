import dotenv from 'dotenv';
import { Client, GatewayIntentBits } from 'discord.js';
import { config } from './config';
import { createLogger } from './utils/logger';
import { handleMessageCreate } from './features/pinMessages';
import { Task } from './tasks';
import { PinMessagesTask } from './tasks/pinMessagesTask';
import { RoleReactionTask } from './tasks/roleReactionTask';

// Charger les variables d'environnement
dotenv.config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.GuildMembers,
  ],
});

const logger = createLogger(client);

client.once('ready', async () => {
  await logger.info(`Logged in as ${client.user?.tag}`);

  // Liste des tâches à exécuter en parallèle
  const tasks: Task[] = [
    new PinMessagesTask(client, logger),
    new RoleReactionTask(client, logger),
    // Ajoute d'autres tâches ici si besoin
  ];

  // Exécuter toutes les tâches en parallèle
  await Promise.all(tasks.map((task) => task.run()));

  await logger.info('Toutes les tâches initiales ont été exécutées');
});

// Listeners d'événements (non bloquants)
client.on('messageCreate', async (message) => {
  try {
    await handleMessageCreate(message, logger);
  } catch (error) {
    await logger.error(`Erreur lors du traitement du message : ${error}`);
  }
});

client.on('error', async (error) => {
  await logger.error(`Client error: ${error.message}`);
});

client.login(config.botToken).catch((error) => {
  console.error('Erreur lors de la connexion au client Discord :', error.message);
  process.exit(1);
});