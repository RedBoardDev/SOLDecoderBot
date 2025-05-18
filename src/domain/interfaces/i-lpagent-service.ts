import type { HistoricalPosition, PositionResponse } from '../../schemas/position-response.schema';
import type { Frequency } from '../value-objects/frequency';

export interface ILpAgentService {
  fetchPosition(txId: string): Promise<PositionResponse>;
  fetchRange(wallet: string, startUtc: Date, endUtc: Date): Promise<HistoricalPosition[]>;
  computeRange(freq: Frequency, tz: string): { startUtc: Date; endUtc: Date };
}
