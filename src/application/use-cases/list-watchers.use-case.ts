import { type ListWatchersDto, ListWatchersDtoSchema } from '../dtos/list-watchers.dto';
import type { IWatcherRepository } from '../../domain/interfaces/i-watcher-repository';
import { ZodError } from 'zod';
import { ValidationError, InternalError } from '../errors/application-errors';
import type { Watcher } from '../../domain/entities/watcher';

export class ListWatchersUseCase {
  constructor(private readonly watcherRepo: IWatcherRepository) {}

  async execute(raw: unknown): Promise<Watcher[]> {
    let dto: ListWatchersDto;
    try {
      dto = ListWatchersDtoSchema.parse(raw);
    } catch (err) {
      if (err instanceof ZodError) {
        throw new ValidationError('Invalid parameters for listing watchers');
      }
      throw new InternalError('Internal validation error');
    }

    try {
      return await this.watcherRepo.listByGuild(dto.guildId);
    } catch {
      throw new InternalError('Unable to retrieve watchers, please try again later.');
    }
  }
}
