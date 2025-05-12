import { z } from 'zod';

export const RemoveWalletWatchDtoSchema = z.object({
  guildId: z.string().nonempty(),
  address: z.string().nonempty(),
  channelId: z.string().nonempty(),
});
export type RemoveWalletWatchDto = z.infer<typeof RemoveWalletWatchDtoSchema>;
