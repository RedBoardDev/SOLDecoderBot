import type { ParticipantRepository } from '@domain/interfaces/participant-repository.js';
import type { TransactionAnalyzer } from '@domain/interfaces/transaction-analyzer.js';
import type { PriceService } from '@domain/interfaces/price-service.js';
import type { Config } from '@schemas/config.schema.js';
import { ParticipantSummarySchema, type ParticipantSummaryData } from '@schemas/participant.schema.js';
import { WalletAddress } from '@domain/value-objects/wallet-address.js';
import { ApplicationError } from '../errors/application-errors.js';
import { logger } from '@shared/logger.js';

export class GetParticipantSummaryUseCase {
  constructor(
    private readonly participantRepository: ParticipantRepository,
    private readonly transactionAnalyzer: TransactionAnalyzer,
    private readonly priceService: PriceService,
    private readonly config: Config,
  ) {}

  async execute(): Promise<ParticipantSummaryData> {
    const startTime = Date.now();

    try {
      logger.info('🚀 Starting ultra-fast participant analysis...');

      // Load participants and get SOL price in parallel
      const [participants, solPrice] = await Promise.all([
        this.participantRepository.loadAll(),
        this.priceService.getSolPrice(),
      ]);

      if (participants.length === 0) {
        logger.warn('⚠️ No participants found in data file');

        const summaryData: ParticipantSummaryData = {
          participants: [],
          solPrice,
          totalTransactions: 0,
          analysisTime: Date.now() - startTime,
        };

        return ParticipantSummarySchema.parse(summaryData);
      }

      logger.info(`📊 Loaded ${participants.length} participants, analyzing wallet transactions...`);

      // Create wallet address for monitoring
      const walletAddress = WalletAddress.create(this.config.WALLET_ADDRESS);

      // Analyze all transactions
      const allTransactions = await this.transactionAnalyzer.analyzeAllTransactions(walletAddress);

      // Process transactions for each participant
      let totalMatches = 0;
      for (const participant of participants) {
        const participantTransactions = allTransactions.filter((tx) => tx.senderAddress === participant.walletAddress);

        // Add transactions to participant (domain logic handles validation and deduplication)
        for (const transaction of participantTransactions) {
          try {
            participant.addTransaction(
              transaction.signature,
              transaction.solAmount,
              transaction.timestamp * 1000, // Convert to milliseconds
            );
          } catch (error) {
            logger.debug(`Skipping invalid transaction ${transaction.signature}:`, error);
          }
        }

        totalMatches += participantTransactions.length;
      }

      const analysisTime = Date.now() - startTime;
      const summaryData: ParticipantSummaryData = {
        participants,
        solPrice,
        totalTransactions: allTransactions.length,
        analysisTime,
      };

      logger.info(
        `✅ Analysis complete: ${totalMatches} participant transactions found from ${allTransactions.length} total (${(analysisTime / 1000).toFixed(2)}s)`,
      );

      // Validate output with schema
      return ParticipantSummarySchema.parse(summaryData);
    } catch (error) {
      logger.error('❌ Failed to get participant summary:', error);
      throw new ApplicationError(
        `Failed to analyze participants: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }
}
