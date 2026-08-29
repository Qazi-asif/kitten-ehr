import prisma from '../lib/prisma.js';
import { validateUploadedFile } from '../utils/fileValidation.js';
import { persistKittenFile } from '../utils/fileStorage.js';

// Foster Portal data handlers - mounted behind requirePortalAuth (see
// app.js / portalRoutes.js), so req.user.fosterId is guaranteed present and
// belongs to a real, active portal account by the time any handler here
// runs. Every query below filters exclusively by req.user.fosterId, never a
// client-supplied foster id - matches the scoping discipline already spelled
// out in the (previously empty) portalRoutes.js stub comment.
//
// NOTE: submittedByFosterId (used in getMyKittenDocuments and
// uploadMyKittenDocument) was just added to schema.prisma but has NOT been
// migrated against the database yet. Every handler that touches it will
// fail at runtime until that migration is applied.

const placementInclude = {
  kitten: {
    select: {
      id: true,
      name: true,
      status: true,
      breed: true,
      color: true,
      coatPattern: true,
      primaryPhotoUrl: true,
    },
  },
};

export async function getMyPlacements(req, res, next) {
  try {
    const placements = await prisma.placement.findMany({
      where: { fosterId: req.user.fosterId },
      orderBy: { intakeDate: 'desc' },
      include: placementInclude,
    });

    res.json(placements);
  } catch (error) {
    next(error);
  }
}

// Shared guard for both document handlers below - a kitten is only
// visible/writable through the portal while this foster currently has an
// open (undischarged) placement for it. Deliberately re-checked on every
// request rather than cached, since a discharge can happen between page
// load and a subsequent upload attempt.
async function assertActivePlacement(fosterId, kittenId) {
  return prisma.placement.findFirst({
    where: { fosterId, kittenId, dischargeDate: null },
  });
}

// Scoped to documents this foster themselves submitted (submittedByFosterId
// = req.user.fosterId), not every document on the kitten - staff-uploaded
// records (vet notes, contracts-adjacent files, etc.) are not exposed here.
// This is a deliberately conservative read scope; broadening it to "every
// document for a kitten currently in this foster's care" would be a
// separate, larger decision about what fosters are allowed to see.
export async function getMyKittenDocuments(req, res, next) {
  try {
    const kittenId = Number.parseInt(req.params.kittenId, 10);

    const placement = await assertActivePlacement(req.user.fosterId, kittenId);
    if (!placement) {
      return res.status(403).json({ error: 'This kitten is not currently placed with you' });
    }

    const documents = await prisma.document.findMany({
      where: { kittenId, submittedByFosterId: req.user.fosterId },
      orderBy: { uploadedAt: 'desc' },
    });

    res.json(documents);
  } catch (error) {
    next(error);
  }
}

const OWN_PROFILE_SELECT = {
  id: true,
  name: true,
  email: true,
  phone: true,
  address: true,
  emergencyContact: true,
  experienceLevel: true,
  capabilityFlags: true,
  maxKittens: true,
  photoUrl: true,
  isActive: true,
  createdAt: true,
};

// PATCH /me is intentionally restrictive: name/email/maxKittens/
// capabilityFlags/experienceLevel/isActive are staff-managed fields (set via
// the admin Fosters screen) and are read-only through the portal. Anything
// not in this list is silently ignored rather than erroring, so extra keys
// in the request body never leak through.
const EDITABLE_PROFILE_FIELDS = ['phone', 'address', 'emergencyContact', 'photoUrl'];

export async function getMyProfile(req, res, next) {
  try {
    const foster = await prisma.foster.findUnique({
      where: { id: req.user.fosterId },
      select: OWN_PROFILE_SELECT,
    });

    if (!foster) return res.status(404).json({ error: 'Foster record not found' });

    res.json(foster);
  } catch (error) {
    next(error);
  }
}

export async function updateMyProfile(req, res, next) {
  try {
    const data = {};

    for (const field of EDITABLE_PROFILE_FIELDS) {
      if (req.body[field] === undefined) continue;
      const value = req.body[field];
      if (field === 'photoUrl') {
        data.photoUrl = typeof value === 'string' && value ? value : null;
        continue;
      }
      if (typeof value !== 'string') {
        return res.status(400).json({ error: `${field} must be a string` });
      }
      data[field] = value.trim();
    }

    if (data.phone !== undefined && !data.phone) {
      return res.status(400).json({ error: 'Phone is required' });
    }
    if (data.address !== undefined && !data.address) {
      return res.status(400).json({ error: 'Address is required' });
    }

    // Writes straight to the Foster table (not a portal-only shadow copy) so
    // staff see the update immediately on the admin Foster detail page.
    const foster = await prisma.foster.update({
      where: { id: req.user.fosterId },
      data,
      select: OWN_PROFILE_SELECT,
    });

    res.json(foster);
  } catch (error) {
    next(error);
  }
}

export async function uploadMyKittenDocument(req, res, next) {
  try {
    const kittenId = Number.parseInt(req.params.kittenId, 10);

    const placement = await assertActivePlacement(req.user.fosterId, kittenId);
    if (!placement) {
      return res.status(403).json({ error: 'This kitten is not currently placed with you' });
    }

    const fileCheck = validateUploadedFile(req.file);
    if (!fileCheck.ok) {
      return res.status(fileCheck.status).json({ error: fileCheck.error });
    }

    const { docType, description } = req.body;
    // Same storage pipeline as staff uploads (S3/R2 if configured, else disk).
    // Base64-in-DB fallback was removed — it OOM'd the Hostinger process.
    const fileUrl = await persistKittenFile(kittenId, req.file);

    const document = await prisma.document.create({
      data: {
        kittenId,
        fileName: req.file.originalname,
        fileUrl,
        docType: docType ?? '',
        description: description ?? '',
        kind: 'FILE',
        submittedByFosterId: req.user.fosterId,
      },
    });

    res.status(201).json(document);
  } catch (error) {
    next(error);
  }
}
