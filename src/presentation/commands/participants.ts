import { SlashCommandBuilder, type ChatInputCommandInteraction, type GuildMember } from 'discord.js';
import { createWalletSynchronizationService } from '@services/wallet-synchronization-service.js';
import { DiscordInteractionService } from '@services/discord-interaction-service.js';
import { CoinGeckoPriceService } from '@services/coingecko-price-service.js';
import { config } from '@config/env.js';
import { logger } from '@shared/logger.js';

export const data = new SlashCommandBuilder()
  .setName('participants')
  .setDescription('Admin command: Force sync and show participant progress with real-time blockchain analysis');

function hasRequiredRole(interaction: ChatInputCommandInteraction): boolean {
  try {
    const member = interaction.member as GuildMember;
    if (!member?.roles) return false;

    const requiredRoleId = config.AUTHORIZED_ROLE_ID;
    if (!requiredRoleId) return true; // If no role is configured, allow everyone

    return member.roles.cache.has(requiredRoleId);
  } catch (error) {
    logger.error('Error checking required role:', error);
    return false;
  }
}

export async function execute(interaction: ChatInputCommandInteraction) {
  try {
    // Check if user has the required role
    if (!hasRequiredRole(interaction)) {
      await interaction.reply({
        content: 'You do not have permission to use this command.',
        ephemeral: true,
      });
      return;
    }

    await interaction.deferReply({ ephemeral: true });

    const startTime = Date.now();
    const userId = interaction.user.id;

    logger.commandExecution('participants', userId);

    // Initialize services with error handling
    let walletSyncService;
    let priceService: CoinGeckoPriceService;
    let interactionService: DiscordInteractionService;

    try {
      walletSyncService = await createWalletSynchronizationService(config.RPC_ENDPOINT, config.WALLET_ADDRESS);
      priceService = new CoinGeckoPriceService();
      interactionService = new DiscordInteractionService();
    } catch (serviceError) {
      logger.error('Service initialization failed', serviceError);
      await interaction.editReply({
        content:
          'Service Initialization Failed - There was an error initializing the required services. Please try again later.',
      });
      return;
    }

    logger.info('Starting admin participant analysis with forced synchronization');

    // Get all user investments with error handling
    let allInvestments;
    try {
      const userInvestmentRepo = walletSyncService.getUserInvestmentRepository();
      allInvestments = await userInvestmentRepo.findAll();
    } catch (dbError) {
      logger.error('Failed to fetch user investments', dbError);
      await interaction.editReply({
        content: 'Database Error - Failed to fetch user investments from the database. Please try again later.',
      });
      return;
    }

    if (allInvestments.length === 0) {
      await interaction.editReply({
        content: 'No Participants Found - No user investments are currently tracked in the system.',
      });
      return;
    }

    logger.info(`Found ${allInvestments.length} participants, starting forced synchronization`);

    // Update progress
    await interaction.editReply({
      content: `Forced Synchronization Started - Analyzing ${allInvestments.length} participants with fresh blockchain data... This may take a moment...`,
    });

    // Perform forced synchronization using the optimized service
    const syncSummary = await walletSyncService.syncAllWallets({
      batchSize: 3, // Smaller batches for admin command to show progress
      delayBetweenBatches: 200, // Slightly longer delay for stability
    });

    // Update progress with sync results
    await interaction.editReply({
      content: `Synchronization Completed - Processed ${syncSummary.totalWallets} participants. Found ${syncSummary.newTransactionsFound} new transactions. ${syncSummary.failedSyncs > 0 ? `${syncSummary.failedSyncs} sync failures.` : 'All syncs successful.'} Getting SOL price...`,
    });

    // Get updated investments for display
    const userInvestmentRepo = walletSyncService.getUserInvestmentRepository();
    const updatedInvestments = await userInvestmentRepo.findAll();

    // Get SOL price with error handling
    let solPrice = 0;
    try {
      solPrice = await priceService.getSolPrice();
    } catch (priceError) {
      logger.error('Failed to get SOL price', priceError);
      solPrice = 0; // Will be handled in the display
    }

    const analysisTime = Date.now() - startTime;

    // Generate summary using the investment summary method
    let embeds;
    try {
      if (solPrice > 0) {
        embeds = interactionService.generateInvestmentSummary(updatedInvestments, solPrice, analysisTime, interaction);
      } else {
        // Fallback display without price
        embeds = interactionService.generateInvestmentSummary(updatedInvestments, 1, analysisTime, interaction);
        // Add a note about missing price data
        if (embeds.length > 0) {
          embeds[0].setDescription('Note: Unable to fetch current SOL price. USD values may be inaccurate.');
        }
      }
    } catch (displayError) {
      logger.error('Failed to generate investment summary', displayError);
      await interaction.editReply({
        content: 'Display Error - Failed to generate the investment summary display. Please try again later.',
      });
      return;
    }

    // Add sync information to the first embed
    if (embeds.length > 0) {
      const syncInfo = [];

      if (syncSummary.newTransactionsFound > 0) {
        syncInfo.push(`${syncSummary.newTransactionsFound} new transactions found`);
      } else {
        syncInfo.push('All data was up to date');
      }

      if (syncSummary.failedSyncs > 0) {
        syncInfo.push(`${syncSummary.failedSyncs} sync failures`);
      }

      syncInfo.push(`Forced sync completed in ${(syncSummary.totalProcessingTime / 1000).toFixed(2)}s`);

      const footerText = embeds[0].data.footer?.text || 'SOL Decoder Bot - Investment tracking system';
      embeds[0].setFooter({
        text: `${footerText} - Admin Command - ${syncInfo.join(' - ')}`,
        iconURL: embeds[0].data.footer?.icon_url || 'https://cryptologos.cc/logos/solana-sol-logo.png',
      });

      // Update title to indicate this was a forced sync
      embeds[0].setTitle('💰 Investment Participant Dashboard - Forced Sync Complete');
    }

    await interaction.editReply({
      content: null,
      embeds,
    });

    logger.info(
      `Admin participant summary completed for user ${userId} - ${syncSummary.totalWallets} participants, ${syncSummary.newTransactionsFound} new transactions, ${syncSummary.failedSyncs} failures (${(analysisTime / 1000).toFixed(2)}s total)`,
    );
  } catch (error) {
    logger.error('Error in participants command', error);

    const errorContent =
      'Unexpected Error - An unexpected error occurred while fetching participant data. The development team has been notified.';

    try {
      if (interaction.deferred) {
        await interaction.editReply({ content: errorContent });
      } else if (!interaction.replied) {
        await interaction.reply({ content: errorContent, ephemeral: true });
      }
    } catch (replyError) {
      logger.error('Failed to send error reply', replyError);
    }
  }
}
