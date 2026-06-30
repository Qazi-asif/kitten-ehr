import { z } from 'zod';

export const KITTEN_STATUSES = [
  'In Foster Care',
  'Available for Adoption',
  'Adopted',
  'Medical Hold',
  'Transferred',
  'Deceased',
];

const optionalDate = z
  .union([z.string().min(1), z.null()])
  .optional()
  .transform((value) => (value ? new Date(value) : null));

export const createKittenSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(50, 'Name must be 50 characters or less'),
  status: z.enum(KITTEN_STATUSES).optional().default('In Foster Care'),
  breed: z.string().trim().min(1, 'Breed is required').max(80),
  color: z.string().max(80).optional().default(''),
  litterId: z.coerce.number().int().positive().optional().nullable(),
  currentFosterId: z.coerce.number().int().positive().optional().nullable(),
  fosterId: z.coerce.number().int().positive().optional().nullable(),
  dateOfBirth: optionalDate,
  sex: z.string().max(20).optional().default(''),
  fixedStatus: z.string().max(40).optional().default(''),
  rescueStory: z.string().max(5000).optional().default(''),
  weightGrams: z.coerce.number().positive('Weight must be a positive number').optional(),
});

export const updateKittenSchema = z
  .object({
    name: z.string().trim().min(1).max(50).optional(),
    status: z.enum(KITTEN_STATUSES).optional(),
    breed: z.string().trim().min(1).max(80).optional(),
    color: z.string().max(80).optional(),
    sex: z.string().max(20).optional(),
    fixedStatus: z.string().max(40).optional(),
    rescueStory: z.string().max(5000).optional(),
    dateOfBirth: optionalDate,
    fivFelvStatus: z.string().max(80).optional().nullable(),
    specialNeeds: z.string().max(5000).optional().nullable(),
    microchipNumber: z.string().max(80).optional(),
    intakeDate: optionalDate,
    intakeSource: z.string().max(200).optional(),
    notes: z.string().max(10000).optional(),
    internalNotes: z.string().max(10000).optional(),
    isListedOnWebsite: z.boolean().optional(),
    websiteFeaturedComment: z.string().max(2000).optional(),
    primaryPhotoUrl: z.string().max(5_000_000).optional().nullable(),
    litterId: z.coerce.number().int().positive().optional().nullable(),
    currentFosterId: z.coerce.number().int().positive().optional().nullable(),
    weightGrams: z.coerce.number().positive('Weight must be a positive number').optional(),
  })
  .strict();

export function formatZodError(error) {
  return error.errors.map((issue) => issue.message).join('; ');
}
