import axios from 'axios';
import { RateLimiter } from './rate-limiter';
import {
  PositionHistoryResponseSchema,
  type RawHistoricalPosition,
} from '../../schemas/position-history-response.schema';
import {
  type HistoricalPosition,
  type PositionResponse,
  PositionResponseSchema,
} from '../../schemas/position-response.schema';
import { logger } from '../../shared/logger';
import type { ILpAgentService } from '../../domain/interfaces/i-lpagent-service';
import type { Frequency } from '../../domain/value-objects/frequency';

export class LpAgentService implements ILpAgentService {
  private static _instance: LpAgentService;

  public static getInstance(): LpAgentService {
    if (!LpAgentService._instance) {
      LpAgentService._instance = new LpAgentService();
    }
    return LpAgentService._instance;
  }

  private constructor(
    private readonly limiter = new RateLimiter(1_000),
    private readonly maxRetries = 3,
    private readonly baseDelayMs = 5_000, // Initial backoff delay
    private readonly backoffMultiplier = 1.5, // Exponential multiplier
    private readonly pageSize = 25, // Pagination size
  ) {}

  /**
   * Retries the passed function up to `maxRetries`, with exponential backoff.
   */
  private async retry<T>(fn: () => Promise<T>): Promise<T> {
    let attempt = 0;
    let delay = this.baseDelayMs;
    while (true) {
      try {
        return await fn();
      } catch (err) {
        attempt++;
        if (attempt >= this.maxRetries) {
          logger.error(`Max retries reached for ${fn.name}`, err);
          throw err;
        }
        logger.warn(`Retrying ${fn.name} (${attempt}/${this.maxRetries})...`, err);
        await new Promise((r) => setTimeout(r, delay));
        delay = Math.round(delay * this.backoffMultiplier);
      }
    }
  }

  public async fetchPosition(txId: string): Promise<PositionResponse> {
    return this.limiter.enqueue(() =>
      this.retry(async () => {
        const res = await axios.get(`https://api.lpagent.io/api/v1/lp-bot/lp-positions/${txId}`);
        return PositionResponseSchema.parse(res.data);
      }),
    );
  }

  public async fetchRange(wallet: string, startUtc: Date, endUtc: Date): Promise<HistoricalPosition[]> {
    const out: HistoricalPosition[] = [];
    let page = 1;
    let keepGoing = true;

    while (keepGoing) {
      const url = [
        `https://api.lpagent.io/api/v1/lp-bot/lp-positions/historical/${wallet}`,
        `?page=${page}`,
        `&pageSize=${this.pageSize}`,
        '&order_by=close_at',
        '&sort_order=desc',
        '&platform=meteora',
      ].join('');

      const rawList = await this.limiter.enqueue(() =>
        this.retry(async () => {
          const resp = await axios.get<unknown>(url);
          const parsed = PositionHistoryResponseSchema.parse(resp.data);
          return parsed.data.data as RawHistoricalPosition[];
        }),
      );

      if (rawList.length === 0) break;

      for (const raw of rawList) {
        const ts = Date.parse(raw.closeAt);
        if (ts >= startUtc.getTime() && ts < endUtc.getTime()) {
          out.push({
            closeAt: raw.closeAt,
            pnlUsd: raw.pnl.value,
            pnlSol: raw.pnl.valueNative,
            feeSol: raw.feeNative,
            percent: raw.pnl.percent,
          });
        } else if (ts < startUtc.getTime()) {
          keepGoing = false;
          break;
        }
      }

      if (!keepGoing || rawList.length < this.pageSize) break;
      page++;
    }

    return out;
  }

  public computeRange(freq: Frequency, tz: string): { startUtc: Date; endUtc: Date } {
    const end = new Date();
    let start: Date;
    switch (freq) {
      case 'DAY':
        start = new Date(end.getTime() - 24 * 60 * 60 * 1000);
        break;
      case 'WEEK':
        start = new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'MONTH':
        start = new Date(end);
        start.setMonth(start.getMonth() - 1);
        break;
      default:
        start = new Date(end.getTime() - 24 * 60 * 60 * 1000);
    }
    return { startUtc: start, endUtc: end };
  }
}
