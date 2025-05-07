import { type AddWatcherDto, AddWatcherDtoSchema } from '../dtos/add-watcher.dto';
import type { IWatcherRepository } from '../../domain/interfaces/i-watcher-repository';
import { Watcher } from '../../domain/entities/watcher';
import { Threshold } from '../../domain/value-objects/threshold';
import { ZodError } from 'zod';
import { ValidationError, AlreadyExistsError, InternalError } from '../errors/application-errors';

export class AddWatcherUseCase {
  constructor(private readonly watcherRepo: IWatcherRepository) {}

  async execute(raw: unknown): Promise<void> {
    let dto: AddWatcherDto;
    try {
      dto = AddWatcherDtoSchema.parse(raw);
    } catch (err) {
      if (err instanceof ZodError) {
        throw new ValidationError(`Invalid parameters: ${err.issues.map((i) => i.message).join(', ')}`);
      }
      throw new InternalError('Internal validation error');
    }

    const { guildId, channelId } = dto;
    const existing = await this.watcherRepo.findByGuildAndChannel(guildId, channelId);
    if (existing) {
      throw new AlreadyExistsError('This channel is already being watched.');
    }

    const watcher = Watcher.create({
      guildId,
      channelId,
      threshold: Threshold.create(0),
      image: false,
      pin: false,
      followed: true,
    });

    try {
      await this.watcherRepo.save(watcher);
    } catch (err) {
      throw new InternalError('Unable to create configuration, please try again later.');
    }
  }
}
