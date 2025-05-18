import { z } from 'zod';

export const RawHistoricalPositionSchema = z.object({
  closeAt: z.string(),
  pnl: z.object({
    value: z.number(), // USD
    valueNative: z.number(), // SOL
    percent: z.number(),
  }),
  feeNative: z.number(),
});

export const PaginationSchema = z.object({
  currentPage: z.number(),
  totalPages: z.number(),
  totalCount: z.number(),
  pageSize: z.number(),
});

export const PositionHistoryResponseSchema = z.object({
  status: z.string(),
  count: z.number(),
  data: z.object({
    data: z.array(RawHistoricalPositionSchema),
    pagination: PaginationSchema,
  }),
});

export type RawHistoricalPosition = z.infer<typeof RawHistoricalPositionSchema>;
export type PositionHistoryResponse = z.infer<typeof PositionHistoryResponseSchema>;
