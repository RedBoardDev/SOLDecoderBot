import { ZodError } from 'zod';
import { AddWalletWatchDtoSchema, type AddWalletWatchDto } from '../dtos/add-wallet-watch.dto';
import type { IWalletWatchRepository } from '../../domain/interfaces/i-wallet-watch-repository';
import { WalletWatch } from '../../domain/entities/wallet-watch';
import { ValidationError, AlreadyExistsError, InternalError } from '../errors/application-errors';

export class AddWalletWatchUseCase {
  constructor(private readonly repo: IWalletWatchRepository) {}

  async execute(raw: unknown): Promise<void> {
    let dto: AddWalletWatchDto;
    try {
      dto = AddWalletWatchDtoSchema.parse(raw);
    } catch (err) {
      if (err instanceof ZodError) {
        throw new ValidationError(err.issues.map((i) => i.message).join(', '));
      }
      throw new InternalError('Validation error');
    }

    const { guildId, address, channelId } = dto;
    const existing = await this.repo.findByGuildAddressAndChannel(guildId, address, channelId);
    if (existing) {
      throw new AlreadyExistsError(`Already watching \`${address}\``);
    }

    const watch = WalletWatch.create({ guildId, address, channelId, notifyOnClose: false });
    try {
      await this.repo.save(watch);
    } catch {
      throw new InternalError('Unable to create watch');
    }
  }
}
