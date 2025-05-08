import type { ILpAgentClient } from '../../domain/interfaces/i-lpagent-client';
import axios from 'axios';

export class LpAgentClient implements ILpAgentClient {
  async fetchPosition(txId: string): Promise<unknown> {
    const res = await axios.get(`https://api.lpagent.io/api/v1/lp-bot/lp-positions/${txId}`);
    return res.data;
  }
}
