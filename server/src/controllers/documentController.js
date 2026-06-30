import prisma from '../lib/prisma.js';
import { validateUploadedFile } from '../utils/fileValidation.js';
import { parseImageUpload } from '../utils/parseImageUpload.js';
import {
  isPhotoDocument,
  photoDocumentOrderBy,
  photoDocumentSelect,
} from '../utils/photoDocuments.js';

async function findKitten(kittenId) {
  return prisma.kitten.findUnique({ where: { id: kittenId } });
}

export async function getDocumentsByKitten(req, res, next) {
  try {
    const kittenId = Number.parseInt(req.params.kittenId, 10);

    const kitten = await findKitten(kittenId);
    if (!kitten) return res.status(404).json({ error: 'Kitten not found' });

    const documents = await prisma.document.findMany({
      where: { kittenId },
      orderBy: { uploadedAt: 'desc' },
    });

    res.json(documents);
  } catch (error) {
    next(error);
  }
}

export async function getPhotosByKitten(req, res, next) {
  try {
    const kittenId = Number.parseInt(req.params.kittenId, 10);

    const kitten = await findKitten(kittenId);
    if (!kitten) return res.status(404).json({ error: 'Kitten not found' });

    const documents = await prisma.document.findMany({
      where: { kittenId },
      orderBy: photoDocumentOrderBy(),
      select: photoDocumentSelect(),
    });

    let photos = documents.filter(isPhotoDocument);

    if (kitten.primaryPhotoUrl && !photos.some((photo) => photo.fileUrl === kitten.primaryPhotoUrl)) {
      photos = [
        {
          id: 'legacy-primary',
          fileName: 'Profile photo',
          fileUrl: kitten.primaryPhotoUrl,
          docType: 'Primary Photo',
          isPrimaryPhoto: true,
          sortOrder: 0,
          uploadedAt: kitten.createdAt,
        },
        ...photos,
      ];
    }

    res.json({
      primaryPhotoUrl: kitten.primaryPhotoUrl,
      photos,
    });
  } catch (error) {
    next(error);
  }
}

export async function uploadDocument(req, res, next) {
  try {
    const kittenId = Number.parseInt(req.params.kittenId, 10);

    const fileCheck = validateUploadedFile(req.file);
    if (!fileCheck.ok) {
      return res.status(fileCheck.status).json({ error: fileCheck.error });
    }

    const kitten = await findKitten(kittenId);
    if (!kitten) return res.status(404).json({ error: 'Kitten not found' });

    const { docType, description } = req.body;
    const fileUrl = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;

    const document = await prisma.document.create({
      data: {
        kittenId,
        fileName: req.file.originalname,
        fileUrl,
        docType: docType ?? '',
        description: description ?? '',
      },
    });

    res.status(201).json(document);
  } catch (error) {
    next(error);
  }
}

export async function uploadPhoto(req, res, next) {
  try {
    const kittenId = Number.parseInt(req.params.kittenId, 10);
    const upload = parseImageUpload(req);

    const fileCheck = validateUploadedFile(upload);
    if (!fileCheck.ok) {
      return res.status(fileCheck.status).json({ error: fileCheck.error });
    }

    if (!upload.mimetype?.startsWith('image/')) {
      return res.status(400).json({ error: 'Only image files are allowed' });
    }

    const kitten = await findKitten(kittenId);
    if (!kitten) return res.status(404).json({ error: 'Kitten not found' });

    const fileUrl = `data:${upload.mimetype};base64,${upload.buffer.toString('base64')}`;
    const setAsPrimary = req.body.setAsPrimary === 'true' || req.body.setAsPrimary === true;
    const existingPhotos = await prisma.document.findMany({ where: { kittenId } });
    const hasPrimary = Boolean(kitten.primaryPhotoUrl) || existingPhotos.some((doc) => doc.isPrimaryPhoto);
    const shouldSetPrimary = setAsPrimary || !hasPrimary;

    const photoCount = existingPhotos.filter(isPhotoDocument).length;

    const document = await prisma.$transaction(async (tx) => {
      if (shouldSetPrimary) {
        await tx.document.updateMany({
          where: { kittenId },
          data: { isPrimaryPhoto: false },
        });
        await tx.kitten.update({
          where: { id: kittenId },
          data: { primaryPhotoUrl: fileUrl },
        });
      }

      return tx.document.create({
        data: {
          kittenId,
          fileName: upload.originalname,
          fileUrl,
          docType: shouldSetPrimary ? 'Primary Photo' : 'Photo',
          description: req.body.description ?? '',
          isPrimaryPhoto: shouldSetPrimary,
          sortOrder: photoCount,
        },
        select: photoDocumentSelect(),
      });
    });

    const kittenAfter = await findKitten(kittenId);
    res.status(201).json({ photo: document, primaryPhotoUrl: kittenAfter.primaryPhotoUrl });
  } catch (error) {
    next(error);
  }
}

export async function setPrimaryPhoto(req, res, next) {
  try {
    const kittenId = Number.parseInt(req.params.kittenId, 10);
    const id = Number.parseInt(req.params.id, 10);

    const document = await prisma.document.findFirst({
      where: { id, kittenId },
    });

    if (!document) return res.status(404).json({ error: 'Photo not found' });
    if (!isPhotoDocument(document)) {
      return res.status(400).json({ error: 'Document is not a photo' });
    }

    await prisma.$transaction(async (tx) => {
      await tx.document.updateMany({
        where: { kittenId },
        data: { isPrimaryPhoto: false, docType: 'Photo' },
      });

      await tx.document.update({
        where: { id },
        data: { isPrimaryPhoto: true, docType: 'Primary Photo' },
      });

      await tx.kitten.update({
        where: { id: kittenId },
        data: { primaryPhotoUrl: document.fileUrl },
      });
    });

    const kitten = await findKitten(kittenId);
    res.json({ primaryPhotoUrl: kitten.primaryPhotoUrl, photoId: id });
  } catch (error) {
    next(error);
  }
}

export async function deleteDocument(req, res, next) {
  try {
    const kittenId = Number.parseInt(req.params.kittenId, 10);
    const id = Number.parseInt(req.params.id, 10);

    const document = await prisma.document.findFirst({
      where: { id, kittenId },
    });

    if (!document) return res.status(404).json({ error: 'Document not found' });

    const kitten = await findKitten(kittenId);
    const wasPrimary = document.isPrimaryPhoto || document.fileUrl === kitten?.primaryPhotoUrl;

    await prisma.document.delete({ where: { id } });

    if (wasPrimary && kitten) {
      const nextPhoto = await prisma.document.findFirst({
        where: { kittenId },
        orderBy: photoDocumentOrderBy(),
      });

      const nextPrimary = nextPhoto && isPhotoDocument(nextPhoto) ? nextPhoto : null;

      await prisma.$transaction(async (tx) => {
        if (nextPrimary) {
          await tx.document.updateMany({
            where: { kittenId },
            data: { isPrimaryPhoto: false, docType: 'Photo' },
          });
          await tx.document.update({
            where: { id: nextPrimary.id },
            data: { isPrimaryPhoto: true, docType: 'Primary Photo' },
          });
          await tx.kitten.update({
            where: { id: kittenId },
            data: { primaryPhotoUrl: nextPrimary.fileUrl },
          });
        } else {
          await tx.kitten.update({
            where: { id: kittenId },
            data: { primaryPhotoUrl: null },
          });
        }
      });
    }

    res.status(204).send();
  } catch (error) {
    next(error);
  }
}
