import { z } from 'zod';

export const ListWalletWatchDtoSchema = z.object({
  guildId: z.string().nonempty(),
});

export type ListWalletWatchDto = z.infer<typeof ListWalletWatchDtoSchema>;
