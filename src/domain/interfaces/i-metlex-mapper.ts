/**
 * Port for resolving a Metlex hash into an on-chain tx ID.
 */
export interface IMetlexMapper {
  getTxId(metlexHash: string): Promise<string>;
}
