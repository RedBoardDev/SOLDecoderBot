import { z } from 'zod';

export const AddWalletWatchDtoSchema = z.object({
  guildId: z.string().nonempty(),
  address: z.string().nonempty(),
  channelId: z.string().nonempty(),
});

export type AddWalletWatchDto = z.infer<typeof AddWalletWatchDtoSchema>;
