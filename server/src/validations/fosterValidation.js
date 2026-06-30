import { z } from 'zod';

export const EXPERIENCE_LEVELS = ['Beginner', 'Intermediate', 'Advanced', 'Expert'];

export const CAPABILITY_FLAGS = ['bottle_babies', 'medical_cases', 'feral_tnr', 'large_capacity'];

export const createFosterSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(100),
  phone: z.string().trim().min(1, 'Phone is required').max(40),
  email: z.string().trim().email('Valid email is required').max(120),
  address: z.string().trim().min(1, 'Address is required').max(300),
  emergencyContact: z.string().max(120).optional().default(''),
  experienceLevel: z.enum(EXPERIENCE_LEVELS).optional().default('Beginner'),
  capabilityFlags: z.string().max(500).optional().default(''),
  maxKittens: z.coerce.number().int().min(0, 'Max kittens must be 0 or greater').max(50).optional().default(0),
  photoUrl: z.string().max(5_000_000).optional().nullable(),
  notes: z.string().max(5000).optional().default(''),
});

export const createPlacementSchema = z.object({
  kittenId: z.coerce.number().int().positive('A valid kitten is required'),
  intakeDate: z.string().min(1, 'Intake date is required'),
  notes: z.string().max(2000).optional().default(''),
});

export function formatZodError(error) {
  return error.errors.map((issue) => issue.message).join('; ');
}

export function normalizeCapabilityFlags(flagsInput, maxKittens = 0) {
  const selected = String(flagsInput || '')
    .split(',')
    .map((flag) => flag.trim())
    .filter((flag) => CAPABILITY_FLAGS.includes(flag));

  if (maxKittens >= 4 && !selected.includes('large_capacity')) {
    selected.push('large_capacity');
  }

  return [...new Set(selected)].join(',');
}
