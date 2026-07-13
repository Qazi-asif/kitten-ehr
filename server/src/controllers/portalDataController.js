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
    // Same storage pipeline staff uploads use (persistKittenFile - S3/R2 if
    // configured, else disk, else base64 fallback with a console warning).
    const fileUrl = await persistKittenFile(kittenId, req.file);

    const document = await prisma.document.create({
      data: {
        kittenId,
        fileName: req.file.originalname,
        fileUrl,
        docType: docType ?? '',
        description: description ?? '',
        submittedByFosterId: req.user.fosterId,
      },
    });

    res.status(201).json(document);
  } catch (error) {
    next(error);
  }
}
