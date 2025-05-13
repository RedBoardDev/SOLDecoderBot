import { ZodError } from 'zod';
import type { IWalletWatchRepository } from '../../domain/interfaces/i-wallet-watch-repository';
import { RemoveWalletWatchDtoSchema, type RemoveWalletWatchDto } from '../dtos/remove-wallet-watch.dto';
import { ValidationError, NotFoundError, InternalError } from '../errors/application-errors';
import type { WalletWatch } from '../../domain/entities/wallet-watch';

export class GetWalletWatchUseCase {
  constructor(private readonly repo: IWalletWatchRepository) {}

  async execute(raw: unknown): Promise<WalletWatch> {
    let dto: RemoveWalletWatchDto;
    try {
      dto = RemoveWalletWatchDtoSchema.parse(raw);
    } catch (err) {
      if (err instanceof ZodError) {
        throw new ValidationError(err.issues.map((i) => i.message).join(', '));
      }
      throw new InternalError('Validation error');
    }

    const { guildId, address, channelId } = dto;
    try {
      const watch = await this.repo.findByGuildAddressAndChannel(guildId, address, channelId);
      if (!watch) {
        throw new NotFoundError(`No watch found for ${address} in channel ${channelId}`);
      }
      return watch;
    } catch (err: unknown) {
      if (err instanceof NotFoundError) throw err;
      throw new InternalError('Unable to retrieve watch');
    }
  }
}
