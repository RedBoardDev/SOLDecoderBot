import {
  Connection,
  PublicKey,
  type ParsedTransactionWithMeta,
  type ParsedInstruction,
  type PartiallyDecodedInstruction,
} from '@solana/web3.js';
import { config } from '../config/env';
import { NotFoundError, InternalError } from '../../application/errors/application-errors';

const RELEVANT_INSTRUCTIONS = ['OpenPosition', 'RemoveLiquidityByRange2', 'ClosePositionIfEmpty'];

type SolanaInstruction = ParsedInstruction | PartiallyDecodedInstruction;

export class MeteoraPositionService {
  private static instance: MeteoraPositionService;
  private connection: Connection;
  private programId: string;

  constructor() {
    this.connection = new Connection(config.solanaRpcEndpoint, 'finalized');
    this.programId = config.meteoraProgramId;
  }

  public static getInstance(): MeteoraPositionService {
    if (!MeteoraPositionService.instance) {
      MeteoraPositionService.instance = new MeteoraPositionService();
    }
    return MeteoraPositionService.instance;
  }

  /**
   * Returns the main Meteora position account for a given transaction signature.
   * @param txSignature The transaction signature to inspect.
   * @returns The public key of the main Meteora position account as a string.
   * @throws NotFoundError if the transaction is not found or not finalized.
   */
  async getMainPosition(txSignature: string): Promise<string> {
    const tx = await this.fetchParsedTransaction(txSignature);
    const allInstrs = this.collectAllInstructions(tx);
    const meteoraInstrs = this.filterByProgram(allInstrs);
    const typed = this.typeInstructions(meteoraInstrs, tx.meta?.logMessages ?? []);
    const chosen = this.selectInstruction(typed);
    return this.extractFirstAccount(chosen.instr);
  }

  private async fetchParsedTransaction(signature: string): Promise<ParsedTransactionWithMeta> {
    const tx = await this.connection.getParsedTransaction(signature, {
      maxSupportedTransactionVersion: 0,
    });
    console.log('tx', signature);
    if (!tx) throw new NotFoundError('Transaction not found or not finalized');
    return tx;
  }

  private collectAllInstructions(tx: ParsedTransactionWithMeta): SolanaInstruction[] {
    const top = tx.transaction.message.instructions as SolanaInstruction[];
    const inner = tx.meta?.innerInstructions?.flatMap((block) => block.instructions as SolanaInstruction[]) ?? [];
    return [...top, ...inner];
  }

  private filterByProgram(instrs: SolanaInstruction[]): SolanaInstruction[] {
    const pid = this.programId;
    const filtered = instrs.filter((ix) => {
      const programId = ix.programId instanceof PublicKey ? ix.programId.toBase58() : ix.programId;
      return programId === pid;
    });

    if (filtered.length === 0) {
      throw new NotFoundError('No Meteora instructions found in transaction');
    }
    return filtered;
  }

  private typeInstructions(
    instrs: SolanaInstruction[],
    logs: readonly string[],
  ): { instr: SolanaInstruction; type: string }[] {
    return instrs.map((ix) => ({
      instr: ix,
      type: this.determineType(logs),
    }));
  }

  private determineType(logs: readonly string[]): string {
    const invokeSig = `Program ${this.programId} invoke [1]`;
    const start = logs.findIndex((l) => l.includes(invokeSig));
    if (start < 0) return 'Unknown';

    const entry = logs.slice(start).find((l) => l.startsWith('Program log: Instruction:'));
    return entry?.replace('Program log: Instruction: ', '') ?? 'Unknown';
  }

  private selectInstruction(typed: { instr: SolanaInstruction; type: string }[]): {
    instr: SolanaInstruction;
    type: string;
  } {
    const relevant = typed.filter((t) => RELEVANT_INSTRUCTIONS.includes(t.type));
    return relevant.length > 0 ? relevant[0] : typed[0];
  }

  private extractFirstAccount(instr: SolanaInstruction): string {
    let pubkey: PublicKey;
    if ('accounts' in instr && Array.isArray(instr.accounts)) {
      pubkey = instr.accounts[0];
    } else if ('keys' in instr && Array.isArray(instr.keys)) {
      pubkey = instr.keys[0].pubkey;
    } else {
      throw new InternalError('Cannot extract account from instruction');
    }
    return pubkey.toBase58();
  }
}
