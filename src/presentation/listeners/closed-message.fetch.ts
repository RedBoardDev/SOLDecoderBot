import { MeteoraPositionService } from '../../infrastructure/services/meteora-position';
import { LpAgentClient } from '../../infrastructure/services/lpagent-client';
import { PositionResponseSchema, type PositionResponse } from '../../schemas/position-response.schema';
import { RateLimiter } from '../../infrastructure/services/rate-limiter';

/**
 * Fetches and parses a PositionResponse from a Metlex hash.
 */
export function fetchPositionData(hash: string): Promise<PositionResponse> {
  const limiter = RateLimiter.getInstance();
  return limiter.enqueue(async () => {
    const meteora = MeteoraPositionService.getInstance();
    const lpClient = new LpAgentClient();
    const mainTx = await meteora.getMainPosition(hash);
    const raw = await lpClient.fetchPosition(mainTx);
    return PositionResponseSchema.parse(raw);
  });
}
