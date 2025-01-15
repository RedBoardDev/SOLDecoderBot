import { Client, GatewayIntentBits, TextChannel, Message } from 'discord.js';
import dotenv from 'dotenv';

dotenv.config();

const BOT_TOKEN: string | undefined = process.env.DISCORD_TOKEN;
const CHANNEL_IDS: string[] = ['1324839823655309394', '1318306500006903909'];
const MATCH_PREFIXES: string[] = ['Starting SOL balance', '🛑Stop loss', '🎯Take profit'];

if (!BOT_TOKEN || CHANNEL_IDS.length === 0) {
  console.error('Missing DISCORD_TOKEN or CHANNEL_IDS in code.');
  process.exit(1);
}

const shouldPinMessage = (content: string): boolean => {
  return MATCH_PREFIXES.some((prefix) => content.startsWith(prefix));
};

const pinMessagesOldToNew = async (channel: TextChannel): Promise<void> => {
  try {
    let lastMessageId: string | undefined;
    const messagesToPin: string[] = [];

    while (true) {
      const messages = await channel.messages.fetch({
        limit: 100,
        before: lastMessageId,
      });

      if (messages.size === 0) break;

      messages.forEach((message: Message) => {
        if (shouldPinMessage(message.content) && !message.pinned) {
          messagesToPin.push(message.id);
        }
      });

      lastMessageId = messages.last()?.id;
    }

    for (const messageId of messagesToPin.reverse()) {
      const message = await channel.messages.fetch(messageId);
      await message.pin();
      console.log(`Pinned message: "${message.content}"`);
    }
  } catch (error) {
    console.error('Error while pinning messages:', error);
  }
};

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

client.once('ready', async () => {
  console.log(`Logged in as ${client.user?.tag}`);

  for (const channelId of CHANNEL_IDS) {
    const channel = client.channels.cache.get(channelId) as TextChannel;

    if (channel) {
      await pinMessagesOldToNew(channel);
      console.log(`Finished pinning messages in channel: ${channel.name}`);
    } else {
      console.error(`Channel not found: ${channelId}`);
    }
  }
});

client.on('messageCreate', async (message: Message) => {
  if (
    CHANNEL_IDS.includes(message.channel.id) &&
    shouldPinMessage(message.content) &&
    !message.pinned
  ) {
    try {
      await message.pin();
      console.log(`Pinned a message: "${message.content}"`);
    } catch (error) {
      console.error('Failed to pin message:', error);
    }
  }
});

client.login(BOT_TOKEN);
