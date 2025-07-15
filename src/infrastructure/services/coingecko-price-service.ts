import axios from 'axios';
import type { PriceService } from '@domain/interfaces/price-service.js';
import { PriceServiceError } from '@application/errors/application-errors.js';
import { logger } from '@shared/logger.js';

export class CoinGeckoPriceService implements PriceService {
  private readonly apiUrl = 'https://api.coingecko.com/api/v3/simple/price';
  private cachedPrice = 0;
  private lastPriceUpdate = 0;
  private readonly cacheTimeout = 300000; // 5 minutes

  async getSolPrice(): Promise<number> {
    const now = Date.now();

    // Return cached price if it's still valid
    if (this.cachedPrice > 0 && now - this.lastPriceUpdate < this.cacheTimeout) {
      return this.cachedPrice;
    }

    try {
      const response = await axios.get(this.apiUrl, {
        params: {
          ids: 'solana',
          vs_currencies: 'usd',
        },
        timeout: 10000,
      });

      if (response.data?.solana?.usd) {
        this.cachedPrice = response.data.solana.usd;
        this.lastPriceUpdate = now;
        logger.debug(`💰 SOL price fetched: $${this.cachedPrice.toFixed(2)}`);
        return this.cachedPrice;
      }

      throw new Error('Invalid response format from CoinGecko');
    } catch (error) {
      logger.error('Failed to fetch SOL price from CoinGecko:', error);

      // Return cached price if available, otherwise throw error
      if (this.cachedPrice > 0) {
        logger.warn('Using cached SOL price due to API error');
        return this.cachedPrice;
      }

      throw new PriceServiceError(error instanceof Error ? error.message : 'Unknown error fetching SOL price');
    }
  }
}
