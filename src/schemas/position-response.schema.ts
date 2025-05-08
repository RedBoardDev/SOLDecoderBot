import { z } from 'zod';

/**
 * Minimal schema: only the fields we need for text/image messages.
 */
export const PositionResponseSchema = z.object({
  status: z.string(),
  data: z.object({
    tokenId: z.string(),
    pairName: z.string(),
    pnl: z.object({
      valueNative: z.number(), // change in SOL
      percentNative: z.number(), // change in native %
    }),
    ageHour: z.string(), // duration in hours, e.g. "1.75"
    closeAt: z.string(), // ISO timestamp
    position: z.string(), // position ID
    valueNative: z.number(), // added field
    token0Info: z.object({
      token_symbol: z.string(), // added field
    }),
    token1Info: z.object({
      token_symbol: z.string(), // added field
    }),
  }),
});

export type PositionResponse = z.infer<typeof PositionResponseSchema>;
