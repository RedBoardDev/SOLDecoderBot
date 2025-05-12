import { z } from 'zod';
import { MetlexLinksSchema, type MetlexLink } from './metlex-links.schema';

export const MessageDataSchema = z.string().transform((content, ctx) => {
  const linksParse = MetlexLinksSchema.safeParse(content);
  if (!linksParse.success) {
    linksParse.error.issues.forEach((issue) => ctx.addIssue(issue));
    return z.NEVER;
  }
  const links = linksParse.data as MetlexLink[];

  const walletMatch = content.match(/\(([A-Za-z0-9]+)\.\.\.[A-Za-z0-9]+\)/);
  if (!walletMatch) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'No wallet prefix found in "(xxx…yyy)" format',
    });
    return z.NEVER;
  }

  return {
    walletPrefix: walletMatch[1],
    hashs: links.map((l) => l.hash),
  };
});

export type MessageData = z.infer<typeof MessageDataSchema>;
