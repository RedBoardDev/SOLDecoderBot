import { SlashCommandBuilder, type ChatInputCommandInteraction } from 'discord.js';
import { DynamoUserInvestmentRepository } from '@repositories/dynamo-user-investment-repository.js';
import { CoinGeckoPriceService } from '@services/coingecko-price-service.js';
import { UserInvestment } from '@domain/entities/user-investment.js';
import { WalletAddress } from '@domain/value-objects/wallet-address.js';
import { config } from '@config/env.js';
import { logger } from '@shared/logger.js';

export const data = new SlashCommandBuilder()
  .setName('wallet')
  .setDescription('Manage your Solana wallet tracking and view your investment data')
  .addSubcommand((subcommand) =>
    subcommand
      .setName('link')
      .setDescription('Link your Solana wallet address to your Discord account')
      .addStringOption((option) =>
        option.setName('wallet').setDescription('Your Solana wallet address').setRequired(true),
      ),
  )
  .addSubcommand((subcommand) =>
    subcommand.setName('summary').setDescription('View your detailed investment summary and statistics'),
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  const discordUserId = interaction.user.id;
  const subcommand = interaction.options.getSubcommand(false);

  try {
    // Initialize services
    const userInvestmentRepo = new DynamoUserInvestmentRepository();

    // Handle subcommands
    switch (subcommand) {
      case 'link':
        await handleLinkWallet(interaction, discordUserId, userInvestmentRepo);
        break;
      case 'summary':
        await handleWalletSummary(interaction, discordUserId, userInvestmentRepo);
        break;
      default:
        // Default behavior - show quick overview if wallet is linked, otherwise prompt to link
        await handleDefaultCommand(interaction, discordUserId, userInvestmentRepo);
        break;
    }
  } catch (error) {
    logger.error(`Error executing wallet command for user ${discordUserId}:`, error);

    const errorContent = '❌ An error occurred while processing your request. Please try again later.';

    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({ content: errorContent, ephemeral: true });
    } else {
      await interaction.reply({ content: errorContent, ephemeral: true });
    }
  }
}

/**
 * Handle the /wallet link command
 */
async function handleLinkWallet(
  interaction: ChatInputCommandInteraction,
  discordUserId: string,
  userInvestmentRepo: DynamoUserInvestmentRepository,
) {
  await interaction.deferReply({ ephemeral: true });

  try {
    const walletAddressInput = interaction.options.getString('wallet', true);

    // Validate wallet address
    let walletAddress: WalletAddress;
    try {
      walletAddress = WalletAddress.create(walletAddressInput);
    } catch (error) {
      await interaction.editReply({
        content: '❌ Invalid wallet address format. Please provide a valid Solana wallet address.',
      });
      return;
    }

    // Check if user already has a linked wallet
    const existingInvestment = await userInvestmentRepo.findByDiscordUserId(discordUserId);
    if (existingInvestment) {
      await interaction.editReply({
        content: `❌ You already have a wallet linked: \`${existingInvestment.walletAddress}\`\n\nIf you want to change your wallet, please contact an administrator.`,
      });
      return;
    }

    // Check if wallet is already linked to another user
    const existingWalletUser = await userInvestmentRepo.findByWalletAddress(walletAddress.toString());
    if (existingWalletUser) {
      await interaction.editReply({
        content: '❌ This wallet address is already linked to another Discord account.',
      });
      return;
    }

    // Check if this is the monitored wallet
    if (walletAddress.toString() === config.WALLET_ADDRESS) {
      await interaction.editReply({
        content: '❌ You cannot link the monitored wallet address. Please use your personal wallet address.',
      });
      return;
    }

    // Create new user investment
    const userInvestment = UserInvestment.create(discordUserId, walletAddress.toString(), 0);
    await userInvestmentRepo.save(userInvestment);

    logger.info(`Wallet linked successfully for user ${discordUserId}: ${walletAddress.toString()}`);

    await interaction.editReply({
      content: `✅ **Wallet linked successfully!**\n\n🔗 **Wallet:** \`${walletAddress.toString()}\`\n📊 Your investment data will be updated during the next sync cycle.\n\n💡 Use \`/wallet summary\` to view detailed information once sync is complete.`,
    });
  } catch (error) {
    logger.error(`Failed to link wallet for user ${discordUserId}:`, error);
    await interaction.editReply({
      content: '❌ Failed to link wallet. Please try again later.',
    });
  }
}

/**
 * Handle the /wallet summary command
 */
async function handleWalletSummary(
  interaction: ChatInputCommandInteraction,
  discordUserId: string,
  userInvestmentRepo: DynamoUserInvestmentRepository,
) {
  await interaction.deferReply({ ephemeral: true });

  try {
    // Find user investment
    const userInvestment = await userInvestmentRepo.findByDiscordUserId(discordUserId);

    if (!userInvestment) {
      await interaction.editReply({
        content: '❌ **No wallet linked**\n\nPlease link your wallet first using `/wallet link <your_wallet_address>`',
      });
      return;
    }

    // Get SOL price for USD conversion
    const priceService = new CoinGeckoPriceService();
    const solPrice = await priceService.getSolPrice();

    const investedAmountUSD = userInvestment.investedAmount * solPrice;

    // Format detailed summary
    const summaryLines = [
      '📊 **Investment Summary**',
      '',
      `🔗 **Wallet:** \`${userInvestment.walletAddress}\``,
      `💰 **Invested Amount:** ${userInvestment.investedAmount.toFixed(6)} SOL`,
      `💵 **USD Value:** $${investedAmountUSD.toFixed(2)}`,
      `📅 **Linked:** ${new Date(userInvestment.createdAt).toLocaleDateString()}`,
      `🔄 **Last Updated:** ${new Date(userInvestment.updatedAt).toLocaleString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })}`,
      '',
      `📈 **SOL Price:** $${solPrice.toFixed(2)}`,
    ];

    await interaction.editReply({
      content: summaryLines.join('\n'),
    });

    logger.info(`Investment summary provided for user ${discordUserId}`);
  } catch (error) {
    logger.error(`Failed to get investment summary for user ${discordUserId}:`, error);
    await interaction.editReply({
      content: '❌ Failed to retrieve investment data. Please try again later.',
    });
  }
}

/**
 * Handle the default /wallet command (no subcommand)
 */
async function handleDefaultCommand(
  interaction: ChatInputCommandInteraction,
  discordUserId: string,
  userInvestmentRepo: DynamoUserInvestmentRepository,
) {
  await interaction.deferReply({ ephemeral: true });

  try {
    // Find user investment
    const userInvestment = await userInvestmentRepo.findByDiscordUserId(discordUserId);

    if (!userInvestment) {
      await interaction.editReply({
        content:
          '❌ **No wallet linked**\n\nPlease link your wallet first using `/wallet link <your_wallet_address>`\n\n💡 Once linked, your investment data will be automatically tracked.',
      });
      return;
    }

    // Show quick summary for default command
    const quickSummaryLines = [
      '💼 **Quick Overview**',
      '',
      `🔗 **Wallet:** \`${userInvestment.walletAddress}\``,
      `💰 **Invested:** ${userInvestment.investedAmount.toFixed(6)} SOL`,
      `🔄 **Last Updated:** ${new Date(userInvestment.updatedAt).toLocaleString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })}`,
      '',
      '💡 Use `/wallet summary` for detailed information including USD values.',
    ];

    await interaction.editReply({
      content: quickSummaryLines.join('\n'),
    });

    logger.info(`Quick wallet overview provided for user ${discordUserId}`);
  } catch (error) {
    logger.error(`Failed to get quick wallet overview for user ${discordUserId}:`, error);
    await interaction.editReply({
      content: '❌ Failed to retrieve wallet data. Please try again later.',
    });
  }
}
