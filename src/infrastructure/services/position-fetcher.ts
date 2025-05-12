import { RateLimiter } from './rate-limiter';
import { MeteoraPositionService } from './meteora-position';
import { LpAgentClient } from './lpagent-client';
import { PositionResponseSchema, type PositionResponse } from '../../schemas/position-response.schema.ts';

export class PositionFetcher {
  private static _instance: PositionFetcher;
  private readonly limiter = RateLimiter.getInstance();
  private readonly meteora = MeteoraPositionService.getInstance();
  private readonly lpClient = new LpAgentClient();

  private constructor() {}

  static getInstance(): PositionFetcher {
    if (!PositionFetcher._instance) {
      PositionFetcher._instance = new PositionFetcher();
    }
    return PositionFetcher._instance;
  }

  async fetchPositions(hashs: string[]): Promise<PositionResponse[]> {
    const out: PositionResponse[] = [];

    for (const hash of hashs) {
      const position = await this.limiter.enqueue(async () => {
        const mainTx = await this.meteora.getMainPosition(hash);
        const raw = await this.lpClient.fetchPosition(mainTx);
        return PositionResponseSchema.parse(raw);
      });
      out.push(position);
    }
    return out;
  }

  async fetchPosition(hash: string): Promise<PositionResponse> {
    const position = await this.limiter.enqueue(async () => {
      const mainTx = await this.meteora.getMainPosition(hash);
      const raw = await this.lpClient.fetchPosition(mainTx);
      return PositionResponseSchema.parse(raw);
    });
    return position;
  }
}
