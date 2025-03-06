import { Client, TextChannel } from "discord.js";
import { config } from "../config";

export interface Logger {
  info: (message: string) => Promise<void>;
  error: (message: string) => Promise<void>;
}

export const createLogger = (client: Client): Logger => {
  let logChannel: TextChannel | null = null;

  const initLogChannel = async () => {
    if (!config.logChannelId || !client.isReady()) return;

    try {
      const guild = await client.guilds.fetch(config.guildId);
      const channel = await guild.channels.fetch(config.logChannelId);
      if (channel?.isTextBased()) {
        logChannel = channel as TextChannel;
      } else {
        console.warn(
          `Channel ${config.logChannelId} n'est pas un channel textuel`
        );
      }
    } catch (error) {
      console.error(
        `Erreur lors de l'initialisation du channel de logs : ${error}`
      );
    }
  };

  client.once("ready", initLogChannel);

  return {
    info: async (message: string) => {
      console.log(`[INFO] ${message}`);
      if (logChannel) {
        try {
          await logChannel.send(`**[INFO]** ${message}`);
        } catch (error) {
          console.error(
            `Erreur lors de l'envoi du log INFO sur Discord : ${error}`
          );
        }
      }
    },
    error: async (message: string) => {
      console.error(`[ERROR] ${message}`);
      if (logChannel) {
        try {
          await logChannel.send(`**[ERROR]** ${message}`);
        } catch (error) {
          console.error(
            `Erreur lors de l'envoi du log ERROR sur Discord : ${error}`
          );
        }
      }
    },
  };
};
