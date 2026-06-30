import { z } from 'zod';

export const createEmailTemplateSchema = z.object({
  key: z
    .string()
    .trim()
    .min(3)
    .max(80)
    .regex(/^[a-z0-9._-]+$/, 'Key must use lowercase letters, numbers, dots, dashes, or underscores'),
  name: z.string().trim().min(1).max(120),
  category: z.string().trim().min(1).max(40).default('General'),
  subject: z.string().trim().min(1).max(200),
  bodyHtml: z.string().max(20000).optional().default(''),
  bodyText: z.string().max(20000).optional().default(''),
  description: z.string().max(500).optional().default(''),
  isActive: z.boolean().optional().default(true),
});

export const updateEmailTemplateSchema = z
  .object({
    name: z.string().trim().min(1).max(120).optional(),
    category: z.string().trim().min(1).max(40).optional(),
    subject: z.string().trim().min(1).max(200).optional(),
    bodyHtml: z.string().max(20000).optional(),
    bodyText: z.string().max(20000).optional(),
    description: z.string().max(500).optional(),
    isActive: z.boolean().optional(),
  })
  .strict();

export function formatZodError(error) {
  return error.errors.map((issue) => issue.message).join('; ');
}
