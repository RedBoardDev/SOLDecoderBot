import { Client, TextChannel, Message, PermissionsBitField } from 'discord.js';
import { config } from '../config';
import { Logger } from '../utils/logger';

export const setupRoleReactionMessage = async (client: Client, logger: Logger) => {
  await logger.info('Début de setupRoleReactionMessage');

  let guild;
  try {
    guild = await client.guilds.fetch(config.guildId);
    await logger.info(`Serveur récupéré : ${guild.name} (ID: ${guild.id})`);
  } catch (error) {
    await logger.error(`Erreur lors de la récupération du serveur ${config.guildId} : ${error}`);
    return;
  }

  let channel;
  try {
    channel = (await guild.channels.fetch(config.roleChannelId)) as TextChannel;
    if (!channel) {
      await logger.error(`Channel ${config.roleChannelId} introuvable`);
      return;
    }
    if (!channel.isTextBased()) {
      await logger.error(`Channel ${config.roleChannelId} n'est pas un channel textuel`);
      return;
    }
    await logger.info(`Channel récupéré : ${channel.name} (ID: ${channel.id})`);
  } catch (error) {
    await logger.error(`Erreur lors de la récupération du channel ${config.roleChannelId} : ${error}`);
    return;
  }

  // Vérification des permissions
  const botMember = guild.members.me;
  if (!botMember) {
    await logger.error('Impossible de récupérer le membre du bot dans le serveur');
    return;
  }

  const permissions = channel.permissionsFor(botMember);
  if (!permissions.has([PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.AddReactions])) {
    await logger.error(
      `Le bot n'a pas les permissions nécessaires (SendMessages et AddReactions) dans le channel ${config.roleChannelId}`
    );
    return;
  }

  if (!permissions.has(PermissionsBitField.Flags.MentionEveryone)) {
    await logger.error(
      `Le bot n'a pas la permission de mentionner @everyone dans le channel ${config.roleChannelId}`
    );
    return;
  }

  // Vérifier si un message existant est spécifié dans config
  let message: Message | undefined;
  if (config.roleMessageId) {
    try {
      message = await channel.messages.fetch(config.roleMessageId);
      await logger.info(`Message existant récupéré (ID: ${message.id})`);

      // Mettre à jour le contenu du message
      await message.edit(
        '@everyone\nYo les gens ! Si vous êtes toujours intéressés par le bot, cliquez sur la réaction ✅ ci-dessous. On peut aussi faire un wallet commun au besoin, je vais moi même lancer une config !'
      );
      await logger.info(`Message mis à jour (ID: ${message.id})`);
    } catch (error) {
      await logger.error(`Erreur lors de la récupération ou mise à jour du message ${config.roleMessageId} : ${error}`);
      message = undefined; // On passe à la création d’un nouveau message si ça échoue
    }
  }

  // Si aucun message n’existe ou si la récupération a échoué, en créer un nouveau
  if (!message) {
    try {
      message = await channel.send(
        '@everyone\nYo les gens ! Si vous êtes toujours intéressés par le bot, cliquez sur la réaction ✅ ci-dessous. On peut aussi faire un wallet commun au besoin ! Dites-moi ce que vous en pensez !'
      );
      await logger.info(`Nouveau message créé dans ${channel.name} (ID: ${message.id})`);

      // Loguer l’ID pour que tu puisses le copier/coller dans config.ts
      await logger.info(
        `Veuillez mettre à jour config.roleMessageId avec cet ID : "${message.id}"`
      );

      // Optionnel : Écrire directement dans config.ts (commenté car tu veux gérer manuellement)
      /*
      const configFilePath = path.join(__dirname, '../config.ts');
      let configContent = await fs.readFile(configFilePath, 'utf-8');
      configContent = configContent.replace(
        /roleMessageId: ['"][^'"]*['"]/,
        `roleMessageId: '${message.id}'`
      );
      await fs.writeFile(configFilePath, configContent);
      await logger.info('config.ts mis à jour avec le nouvel ID du message');
      */
    } catch (error) {
      await logger.error(`Erreur lors de l'envoi du message dans le channel ${config.roleChannelId} : ${error}`);
      return;
    }
  }

  // Ajout de la réaction si elle n’est pas déjà présente
  try {
    if (!message.reactions.cache.has('✅')) {
      await message.react('✅');
      await logger.info(`Réaction ✅ ajoutée au message (ID: ${message.id})`);
    } else {
      await logger.info(`Réaction ✅ déjà présente sur le message (ID: ${message.id})`);
    }
  } catch (error) {
    await logger.error(`Erreur lors de l'ajout de la réaction : ${error}`);
    return;
  }

  // Gestion des réactions
  const filter = (reaction: any, user: any) =>
    reaction.emoji.name === '✅' && !user.bot;

  const collector = message.createReactionCollector({ filter });

  collector.on('collect', async (reaction, user) => {
    const member = await guild.members.fetch(user.id);
    const role = await guild.roles.fetch(config.roleId);

    if (!role) {
      await logger.error(`Role ${config.roleId} introuvable`);
      return;
    }

    try {
      await member.roles.add(role);
      await logger.info(`Rôle ${role.name} ajouté à ${user.tag}`);
    } catch (error) {
      await logger.error(`Erreur lors de l'ajout du rôle à ${user.tag} : ${error}`);
    }
  });

  collector.on('remove', async (reaction, user) => {
    const member = await guild.members.fetch(user.id);
    const role = await guild.roles.fetch(config.roleId);

    if (!role) {
      await logger.error(`Role ${config.roleId} introuvable`);
      return;
    }

    try {
      await member.roles.remove(role);
      await logger.info(`Rôle ${role.name} retiré de ${user.tag}`);
    } catch (error) {
      await logger.error(`Erreur lors du retrait du rôle de ${user.tag} : ${error}`);
    }
  });
};