import { z } from 'zod';

export const ListWatchersDtoSchema = z.object({
  guildId: z.string().nonempty(),
});
export type ListWatchersDto = z.infer<typeof ListWatchersDtoSchema>;
