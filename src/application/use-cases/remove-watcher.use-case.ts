import { type RemoveWatcherDto, RemoveWatcherDtoSchema } from '../dtos/remove-watcher.dto';
import type { IWatcherRepository } from '../../domain/interfaces/i-watcher-repository';
import { ZodError } from 'zod';
import { ValidationError, NotFoundError, InternalError } from '../errors/application-errors';

export class RemoveWatcherUseCase {
  constructor(private readonly watcherRepo: IWatcherRepository) {}

  async execute(raw: unknown): Promise<void> {
    let dto: RemoveWatcherDto;
    try {
      dto = RemoveWatcherDtoSchema.parse(raw);
    } catch (err) {
      if (err instanceof ZodError) {
        throw new ValidationError(`Invalid parameters: ${err.issues.map((i) => i.message).join(', ')}`);
      }
      throw new InternalError('Internal validation error');
    }

    const { guildId, channelId } = dto;
    const existing = await this.watcherRepo.findByGuildAndChannel(guildId, channelId);
    if (!existing) {
      throw new NotFoundError('This channel was not being watched.');
    }

    try {
      await this.watcherRepo.delete(guildId, channelId);
    } catch (err) {
      throw new InternalError('Unable to remove the configuration, please try again later.');
    }
  }
}
