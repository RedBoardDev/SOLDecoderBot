import { z } from 'zod';

export const MetlexLinkSchema = z.object({
  url: z.string().url(),
  hash: z.string(),
});
export type MetlexLink = z.infer<typeof MetlexLinkSchema>;

export const MetlexLinksSchema = z.string().transform((content, ctx) => {
  const regex = /https?:\/\/metlex\.io\/pnl2\/([A-Za-z0-9-]+)/g;
  const links: MetlexLink[] = [];
  let match: RegExpExecArray | null;

  match = regex.exec(content);
  while (match !== null) {
    links.push({ url: match[0], hash: match[1] });
    match = regex.exec(content);
  }

  if (links.length === 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'No Metlex PnL links found in text',
    });
    return z.NEVER;
  }

  return links;
});

export type MetlexLinks = z.infer<typeof MetlexLinksSchema>;
