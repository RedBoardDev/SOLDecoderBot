import { Client, GatewayIntentBits, TextChannel } from 'discord.js';
import dotenv from 'dotenv';

dotenv.config();

const BOT_TOKEN = process.env.DISCORD_TOKEN;
const CHANNEL_ID = process.env.CHANNEL_ID;

if (!BOT_TOKEN || !CHANNEL_ID) {
  console.error('Missing DISCORD_TOKEN or CHANNEL_ID in .env file.');
  process.exit(1);
}

const pinMessagesOldToNew = async (channel: TextChannel, matchText: string): Promise<void> => {
  try {
    let lastMessageId: string | undefined;
    const messagesToPin: string[] = [];

    while (true) {
      const messages = await channel.messages.fetch({
        limit: 100,
        before: lastMessageId,
      });

      if (messages.size === 0) break;

      messages.forEach((message) => {
        if (
          message.content.startsWith(matchText) &&
          !message.pinned
        ) {
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
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
});

client.once('ready', async () => {
  console.log(`Logged in as ${client.user?.tag}`);

  const channel = client.channels.cache.get(CHANNEL_ID) as TextChannel;

  if (channel) {
    await pinMessagesOldToNew(channel, 'Opened a new pool ');
    console.log('Finished pinning messages.');
  } else {
    console.error('Channel not found.');
  }
});

client.on('messageCreate', async (message) => {
  if (
    message.channel.id === CHANNEL_ID &&
    message.content.startsWith('Opened a new pool ') &&
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
