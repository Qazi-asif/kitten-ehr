import { z } from 'zod';
import { PUBLISH_PLATFORM_IDS } from '../utils/publishTargets.js';

export const KITTEN_STATUSES = [
  'In Foster Care',
  'Available for Adoption',
  'Adopted',
  'Medical Hold',
  'In Socialization',
  'Transferred',
  'Deceased',
  'Released',
];

/** Statuses that close open foster placements (currentFosterId is kept until staff clears it). */
export const TERMINAL_KITTEN_STATUSES = ['Adopted', 'Transferred', 'Deceased', 'Released'];

export const FIXED_STATUS_OPTIONS = ['Intact', 'Spayed/Neutered'];

const fixedStatusField = z
  .union([z.enum(FIXED_STATUS_OPTIONS), z.literal('')])
  .optional()
  .default('');

const optionalDate = z
  .union([z.string().min(1), z.null()])
  .optional()
  .transform((value) => (value ? new Date(value) : null));

const publishTargetsField = z.array(z.enum(PUBLISH_PLATFORM_IDS)).optional();

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
  fixedStatus: fixedStatusField,
  rescueStory: z.string().max(5000).optional().default(''),
  publishTargets: publishTargetsField,
  weightGrams: z.coerce.number().positive('Weight must be a positive number').optional(),
  intakeDate: optionalDate,
  intakeSource: z.string().max(200).optional().default(''),
  microchipNumber: z.string().max(80).optional().default(''),
  isTnr: z.boolean().optional().default(false),
  isColony: z.boolean().optional().default(false),
});

const optionalUrl = z.string().trim().max(500).optional().nullable();

export const updateKittenSchema = z
  .object({
    name: z.string().trim().min(1).max(50).optional(),
    status: z.enum(KITTEN_STATUSES).optional(),
    breed: z.string().trim().min(1).max(80).optional(),
    color: z.string().max(80).optional(),
    sex: z.string().max(20).optional(),
    fixedStatus: fixedStatusField.optional(),
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
    publishTargets: publishTargetsField,
    litterId: z.coerce.number().int().positive().optional().nullable(),
    isBondedPair: z.boolean().optional(),
    bondedWithKittenId: z.coerce.number().int().positive().optional().nullable(),
    bondedWithName: z.string().max(200).optional(),
    isMedicalSpecialNeeds: z.boolean().optional(),
    isTnr: z.boolean().optional(),
    isColony: z.boolean().optional(),
    weightGrams: z.coerce.number().positive('Weight must be a positive number').optional(),
    // Outcome fields: date for Adopted/Deceased/Released; detail text for Transferred.
    outcomeDate: optionalDate,
    outcomeDetail: z.string().max(500).optional().nullable(),
  })
  .strict();

export function formatZodError(error) {
  return error.errors.map((issue) => issue.message).join('; ');
}
