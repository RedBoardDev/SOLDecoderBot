import { ZodError } from 'zod';
import type { IWalletWatchRepository } from '../../domain/interfaces/i-wallet-watch-repository';
import { ListWalletWatchDtoSchema, type ListWalletWatchDto } from '../dtos/list-wallet-watch.dto';
import { ValidationError, InternalError } from '../errors/application-errors';
import type { WalletWatch } from '../../domain/entities/wallet-watch';

export class ListWalletFromGuildUseCase {
  constructor(private readonly repo: IWalletWatchRepository) {}

  async execute(raw: unknown): Promise<WalletWatch[]> {
    let dto: ListWalletWatchDto;
    try {
      dto = ListWalletWatchDtoSchema.parse(raw);
    } catch (err) {
      if (err instanceof ZodError) {
        throw new ValidationError('Invalid parameters for wallet list.');
      }
      throw new InternalError('Internal validation error');
    }

    try {
      return await this.repo.listByGuild(dto.guildId);
    } catch {
      throw new InternalError('Unable to retrieve watched wallets.');
    }
  }
}
