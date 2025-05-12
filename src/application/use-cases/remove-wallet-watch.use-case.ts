import { ZodError } from 'zod';
import { RemoveWalletWatchDtoSchema, type RemoveWalletWatchDto } from '../dtos/remove-wallet-watch.dto';
import type { IWalletWatchRepository } from '../../domain/interfaces/i-wallet-watch-repository';
import { ValidationError, NotFoundError, InternalError } from '../errors/application-errors';

export class RemoveWalletWatchUseCase {
  constructor(private readonly repo: IWalletWatchRepository) {}

  async execute(raw: unknown): Promise<void> {
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
    const all = await this.repo.listByGuild(guildId);
    const found = all.find((w) => w.address === address && w.channelId === channelId);
    if (!found) {
      throw new NotFoundError(`No watch for ${address} in channel ${channelId}`);
    }

    try {
      await this.repo.delete(guildId, address, channelId);
    } catch {
      throw new InternalError('Unable to remove watch');
    }
  }
}
