import { z } from 'zod';

export const AddWatcherDtoSchema = z.object({
  guildId: z.string().nonempty(),
  channelId: z.string().nonempty(),
});

export type AddWatcherDto = z.infer<typeof AddWatcherDtoSchema>;
