import type { Participant } from '../entities/participant.js';

export interface ParticipantRepository {
  loadAll(): Promise<Participant[]>;
  save(participant: Participant): Promise<void>;
  findByWalletAddress(walletAddress: string): Promise<Participant | null>;
  updateParticipant(participant: Participant): Promise<void>;
}
