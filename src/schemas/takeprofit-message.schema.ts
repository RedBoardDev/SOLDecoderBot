import { z } from 'zod';

/**
 * Parses a “Take profit triggered” message and extracts:
 *  - profitPct: the profit percentage (e.g. 5.39)
 *  - thresholdPct: the threshold percentage that was exceeded (e.g. 1)
 */
export const TakeProfitTriggerSchema = z.string().transform((content, ctx) => {
  const regex = /Take profit triggered:\s*([\d.]+)% profit exceeds\s*([\d.]+)% threshold/;
  const match = content.match(regex);
  if (!match) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Not a valid take-profit trigger message',
    });
    return z.NEVER;
  }
  const [, profit, threshold] = match;
  return {
    profitPct: Number(profit),
    thresholdPct: Number(threshold),
  };
});

export type TakeProfitTrigger = z.infer<typeof TakeProfitTriggerSchema>;
