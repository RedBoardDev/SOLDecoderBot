import { z } from 'zod';

export const RemoveWatcherDtoSchema = z.object({
  guildId: z.string().min(1),
  channelId: z.string().min(1),
});
export type RemoveWatcherDto = z.infer<typeof RemoveWatcherDtoSchema>;
