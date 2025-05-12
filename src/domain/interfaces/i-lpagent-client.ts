/**
 * Interface for a client that fetches position details based on a transaction ID.
 */
export interface ILpAgentClient {
  fetchPosition(txId: string): Promise<unknown>;
}
