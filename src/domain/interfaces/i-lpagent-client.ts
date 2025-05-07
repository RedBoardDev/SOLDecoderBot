/**
 * Port for fetching enriched position data from lpagent.io given a tx ID.
 * The concrete implementer will transform HTTP JSON into a domain-neutral object.
 */
export interface ILpAgentClient {
  fetchPosition(txId: string): Promise<unknown>;
}
