import { z } from 'zod';

/**
 * Parses any text containing a Metlex PnL URL and extracts { url, hash }.
 */
export const MetlexLinkSchema = z.string().transform((content, ctx) => {
  const match = content.match(/https?:\/\/metlex\.io\/pnl2\/([A-Za-z0-9-]+)/);
  if (!match) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'No Metlex PnL link found in text',
    });
    return z.NEVER;
  }
  const [url, hash] = [match[0], match[1]];
  return { url, hash };
});

export type MetlexLink = z.infer<typeof MetlexLinkSchema>;
