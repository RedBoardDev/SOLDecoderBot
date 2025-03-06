import dotenv from 'dotenv';

dotenv.config();

export const config = {
  botToken: process.env.DISCORD_TOKEN || '',
  channelIds: ['1324839823655309394', '1318306500006903909'], // Anciens channels
  roleChannelId: '1331549860989767691', // Channel pour le message de rôle
  guildId: '1318306034741153883', // ID du serveur
  roleId: '1347146656424132658', // ID du rôle à assigner
  matchPrefixes: ['Starting SOL balance', '🛑Stop loss', '🎯Take profit'],
  logChannelId: '1347151946645110845',
  roleMessageId: '1347156773651615744' as string | null,
};

if (!config.botToken) {
  console.error('DISCORD_TOKEN manquant dans le fichier .env');
  process.exit(1);
}
