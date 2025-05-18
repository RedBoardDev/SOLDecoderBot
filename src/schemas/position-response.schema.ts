import { z } from 'zod';

/**
 * Minimal schema: only the fields we need for text/image messages.
 */
export const PositionResponseSchema = z.object({
  status: z.string(), // e.g. "success"
  data: z.object({
    tokenId: z.string(), // e.g. "3iCfTA…KgFhBC"
    pairName: z.string(), // e.g. "SOL/USDC"
    pnl: z.object({
      value: z.number(), // change in USD
      valueNative: z.number(), // change in SOL
      percentNative: z.number(), // change in native %
    }),
    ageHour: z.string(), // duration in hours, e.g. "1.75"
    position: z.string(), // position ID
    value: z.number(), // TVL in USD
    valueNative: z.number(), // TVL in SOL
    token0Info: z.object({
      token_symbol: z.string(), // e.g. "SOL"
    }),
    token1Info: z.object({
      token_symbol: z.string(), // e.g. "USDC"
    }),
  }),
});

export type PositionResponse = z.infer<typeof PositionResponseSchema>;

export interface HistoricalPosition {
  closeAt: string; // ISO-8601
  pnlUsd: number; // USD
  pnlSol: number; // SOL
  feeSol: number; // SOL
  percent: number; // % change
}
