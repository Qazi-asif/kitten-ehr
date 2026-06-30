import { z } from 'zod';

export const createApplicationSchema = z.object({
  type: z.enum(['Adoption', 'Foster'], { errorMap: () => ({ message: 'type must be Adoption or Foster' }) }),
  formData: z.union([
    z.string().min(2, 'formData is required').max(50000),
    z.record(z.unknown()),
  ]),
  kittenOfInterest: z.string().trim().max(200).optional().nullable(),
});

export function formatZodError(error) {
  return error.errors.map((issue) => issue.message).join('; ');
}

export function extractKittenOfInterest(formData, explicitValue) {
  if (explicitValue?.trim()) {
    return explicitValue.trim();
  }

  let parsed = formData;
  if (typeof formData === 'string') {
    try {
      parsed = JSON.parse(formData);
      if (typeof parsed === 'string') {
        parsed = JSON.parse(parsed);
      }
    } catch {
      return null;
    }
  }

  if (typeof parsed !== 'object' || parsed === null) {
    return null;
  }

  const value = parsed.kittenOfInterest || parsed.kittenInterest || parsed.kitten || '';
  return value ? String(value).trim() : null;
}
