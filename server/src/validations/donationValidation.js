import { z } from 'zod';

export const createDonationSchema = z.object({
  donorName: z.string().trim().min(1).max(120),
  donorEmail: z.string().trim().email().max(200),
  amount: z.coerce.number().positive('Amount must be greater than zero'),
  message: z.string().max(2000).optional().default(''),
});

export function formatZodError(error) {
  return error.errors.map((issue) => issue.message).join('; ');
}
