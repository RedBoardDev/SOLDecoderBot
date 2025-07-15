// import fs from 'node:fs/promises';
// import path from 'node:path';
// import { fileURLToPath } from 'node:url';
// import type { ParticipantRepository } from '../../domain/interfaces/participant-repository.js';
// import { Participant } from '../../domain/entities/participant.js';
// import { ParticipantDataSchema, type ParticipantTransaction } from '../../schemas/participant.schema.js';
// import { logger } from '../../shared/logger.js';

// const __filename = fileURLToPath(import.meta.url);
// const __dirname = path.dirname(__filename);

// export class FileParticipantRepository implements ParticipantRepository {
//   private readonly dataFile: string;
//   private participants: Map<string, Participant> = new Map();

//   constructor(dataFile = 'data.txt') {
//     this.dataFile = path.resolve(dataFile);
//   }

//   async loadAll(): Promise<Participant[]> {
//     try {
//       const data = await fs.readFile(this.dataFile, 'utf8');
//       const lines = data
//         .trim()
//         .split('\n')
//         .filter((line) => line.trim());

//       this.participants.clear();

//       for (const line of lines) {
//         const parts = line.split('\t');
//         if (parts.length >= 4) {
//           const [datetime, discordUser, walletAddress, expectedAmountStr] = parts;

//           // Parse amount (handle comma as decimal separator)
//           const expectedAmount = Number.parseFloat(expectedAmountStr.replace(',', '.'));

//           // Validate raw data with schema
//           const participantData = ParticipantDataSchema.parse({
//             datetime,
//             discordUser,
//             walletAddress,
//             expectedAmount,
//             receivedAmount: 0,
//             transactions: [] as ParticipantTransaction[],
//           });

//           // Create domain entity
//           const participant = Participant.create(
//             participantData.datetime,
//             participantData.discordUser,
//             participantData.walletAddress,
//             participantData.expectedAmount,
//           );

//           this.participants.set(walletAddress, participant);
//         }
//       }

//       logger.info(`✅ Loaded ${this.participants.size} participants from ${this.dataFile}`);
//       return Array.from(this.participants.values());
//     } catch (error) {
//       logger.error('Failed to load participants:', error);
//       throw new Error(`Failed to load participants: ${error instanceof Error ? error.message : 'Unknown error'}`);
//     }
//   }

//   async save(participant: Participant): Promise<void> {
//     this.participants.set(participant.walletAddress, participant);
//     logger.debug(`💾 Participant ${participant.discordUser} saved to memory`);
//   }

//   async findByWalletAddress(walletAddress: string): Promise<Participant | null> {
//     return this.participants.get(walletAddress) || null;
//   }

//   async updateParticipant(participant: Participant): Promise<void> {
//     await this.save(participant);
//   }
// }
