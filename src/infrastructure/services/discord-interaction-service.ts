import type { EmbedBuilder, ChatInputCommandInteraction } from 'discord.js';
import { EmbedBuilder as DiscordEmbedBuilder } from 'discord.js';
import type { Participant } from '@domain/entities/participant.js';
import type { UserInvestment } from '@domain/entities/user-investment.js';
import { logger } from '@shared/logger.js';
import { config } from '@config/env.js';

export interface ParticipantSummaryService {
  generateParticipantSummary(participants: Participant[], solPrice: number, analysisTime?: number): EmbedBuilder[];
}

export class DiscordInteractionService implements ParticipantSummaryService {
  generateParticipantSummary(participants: Participant[], solPrice: number, analysisTime?: number): EmbedBuilder[] {
    // Validate inputs
    if (solPrice <= 0) {
      throw new Error('SOL price must be positive');
    }

    const embeds: EmbedBuilder[] = [];

    // Create main summary embed
    const completionStats = this.getCompletionStats(participants);
    const totalExpected = participants.reduce((sum, p) => sum + p.expectedAmount, 0);
    const totalReceived = participants.reduce((sum, p) => sum + p.receivedAmount, 0);
    const totalUsdValue = totalReceived * solPrice;

    const summaryEmbed = new DiscordEmbedBuilder()
      .setTitle('⚡ SOL Participant Dashboard - Real-time Analysis')
      .setColor(0x9945ff)
      .addFields([
        {
          name: '📈 Progress Overview',
          value: `${completionStats.completed}/${completionStats.total} participants completed (${completionStats.percentage}%)`,
          inline: true,
        },
        {
          name: '💰 Expected Total',
          value: `${totalExpected.toFixed(2)} SOL`,
          inline: true,
        },
        {
          name: '💎 Received Total',
          value: `${totalReceived.toFixed(4)} SOL\n$${totalUsdValue.toFixed(2)} USD`,
          inline: true,
        },
      ])
      .setTimestamp();

    // Add performance metrics if available
    if (analysisTime && analysisTime > 0) {
      summaryEmbed.addFields([
        {
          name: '⚡ Performance',
          value: `Analysis completed in ${(analysisTime / 1000).toFixed(2)}s`,
          inline: true,
        },
      ]);
    }

    summaryEmbed.setFooter({
      text: 'SOL Decoder Bot - Ultra-fast blockchain analysis',
      iconURL: 'https://cryptologos.cc/logos/solana-sol-logo.png',
    });

    embeds.push(summaryEmbed);

    // Create participant details embed
    if (participants.length > 0) {
      const detailsEmbed = new DiscordEmbedBuilder().setTitle('👥 Participant Details').setColor(0x9945ff);

      // Group participants in chunks of 25 (Discord field limit)
      const chunks = this.chunkArray(participants, 25);

      for (const chunk of chunks) {
        const fields = chunk.map((participant) => {
          const shortWallet = participant.getShortWalletAddress();
          const walletUrl = `solscan.io/account/${config.WALLET_ADDRESS}?exclude_amount_zero=true&remove_spam=true&from_address=${participant.walletAddress}#transfers`;
          const walletLink = `[${shortWallet}](${walletUrl})`;
          const percent = participant.getCompletionPercentage();
          const usdValue = participant.receivedAmount * solPrice;
          const transactionCount = participant.transactions.length;

          let status = '⏳';
          if (percent >= 100) status = '✅';
          else if (percent > 0) status = '🟡';

          return {
            name: `${status} ${participant.discordUser}`,
            value: `${walletLink}\n${participant.receivedAmount.toFixed(4)}/${participant.expectedAmount} SOL (${percent.toFixed(0)}%)\n$${usdValue.toFixed(2)} USD • ${transactionCount} tx`,
            inline: true,
          };
        });

        detailsEmbed.addFields(fields);
      }

      embeds.push(detailsEmbed);
    }

    return embeds;
  }

  /**
   * Generate participant summary specifically for UserInvestment entities
   * This method properly handles the UserInvestment -> Display conversion
   */
  generateInvestmentSummary(
    investments: UserInvestment[],
    solPrice: number,
    analysisTime?: number,
    interaction?: ChatInputCommandInteraction,
  ): EmbedBuilder[] {
    try {
      // Validate inputs
      if (solPrice <= 0) {
        throw new Error('SOL price must be positive');
      }

      const embeds: EmbedBuilder[] = [];

      // Create main summary embed
      const completionStats = this.getInvestmentCompletionStats(investments);
      const totalInvested = investments.reduce((sum, inv) => sum + inv.investedAmount, 0);
      const totalUsdValue = totalInvested * solPrice;

      const summaryEmbed = new DiscordEmbedBuilder()
        .setTitle('💰 Investment Participant Dashboard - Real-time Analysis')
        .setColor(0x9945ff)
        .addFields([
          {
            name: '📈 Participants Overview',
            value: `${completionStats.active}/${completionStats.total} participants with investments (${completionStats.percentage}%)`,
            inline: true,
          },
          {
            name: '💰 Total Invested',
            value: `${totalInvested.toFixed(4)} SOL`,
            inline: true,
          },
          {
            name: '💵 USD Value',
            value: `$${totalUsdValue.toFixed(2)} USD\n$${solPrice.toFixed(2)} per SOL`,
            inline: true,
          },
        ])
        .setTimestamp();

      // Add performance metrics if available
      if (analysisTime && analysisTime > 0) {
        summaryEmbed.addFields([
          {
            name: '⚡ Performance',
            value: `Analysis completed in ${(analysisTime / 1000).toFixed(2)}s`,
            inline: true,
          },
        ]);
      }

      summaryEmbed.setFooter({
        text: 'SOL Decoder Bot - Investment tracking system',
        iconURL: 'https://cryptologos.cc/logos/solana-sol-logo.png',
      });

      embeds.push(summaryEmbed);

      // Create investment details embed
      if (investments.length > 0) {
        const detailsEmbed = new DiscordEmbedBuilder().setTitle('👥 Investment Details').setColor(0x9945ff);

        // Group investments in chunks of 25 (Discord field limit)
        const chunks = this.chunkArray(investments, 25);

        for (const chunk of chunks) {
          const fields = chunk.map((investment) => {
            const shortWallet = investment.getShortWalletAddress();
            const walletUrl = `https://solscan.io/account/${investment.walletAddress}`;
            const walletLink = `[${shortWallet}](${walletUrl})`;
            const usdValue = investment.investedAmount * solPrice;
            const daysSinceCreation = Math.floor((Date.now() - investment.createdAt.getTime()) / (1000 * 60 * 60 * 24));

            let status = '⏳';
            if (investment.investedAmount > 0) status = '✅';

            // Try to get username from guild member, fallback to mention if not available
            let displayName = `<@${investment.discordUserId}>`;
            if (interaction?.guild) {
              try {
                const member = interaction.guild.members.cache.get(investment.discordUserId);
                if (member) {
                  displayName = member.user.username;
                }
              } catch (error) {
                // Fallback to mention if member not found
                displayName = `<@${investment.discordUserId}>`;
              }
            }

            return {
              name: `${status} ${displayName}`,
              value: `${walletLink}\n💰 **${investment.investedAmount.toFixed(4)} SOL**\n💵 $${usdValue.toFixed(2)} USD\n📅 ${daysSinceCreation} days old`,
              inline: true,
            };
          });

          detailsEmbed.addFields(fields);
        }

        embeds.push(detailsEmbed);
      }

      return embeds;
    } catch (error) {
      logger.error('Error generating investment summary:', error);

      // Return fallback error embed
      const errorEmbed = new DiscordEmbedBuilder()
        .setTitle('❌ Error Generating Summary')
        .setDescription('There was an error generating the investment summary. Please try again later.')
        .setColor(0xff0000)
        .setTimestamp();

      return [errorEmbed];
    }
  }

  async sendParticipantSummary(
    interaction: ChatInputCommandInteraction,
    participants: Participant[],
    solPrice: number,
    analysisTime?: number,
  ): Promise<void> {
    try {
      const embeds = this.generateParticipantSummary(participants, solPrice, analysisTime);

      await interaction.reply({
        embeds,
        ephemeral: true,
      });

      logger.info(`✅ Participant summary sent to ${interaction.user.tag}`);
    } catch (error) {
      logger.error('Failed to send participant summary:', error);

      const errorReply = {
        content: '❌ Failed to generate participant summary. Please try again later.',
        ephemeral: true,
      };

      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(errorReply);
      } else {
        await interaction.reply(errorReply);
      }
    }
  }

  private getCompletionStats(participants: Participant[]) {
    const completed = participants.filter((p) => p.isCompleted()).length;
    const total = participants.length;

    return {
      completed,
      total,
      percentage: total > 0 ? ((completed / total) * 100).toFixed(1) : '0',
    };
  }

  private getInvestmentCompletionStats(investments: UserInvestment[]) {
    const active = investments.filter((inv) => inv.investedAmount > 0).length;
    const total = investments.length;

    return {
      active,
      total,
      percentage: total > 0 ? ((active / total) * 100).toFixed(1) : '0',
    };
  }

  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }
}
