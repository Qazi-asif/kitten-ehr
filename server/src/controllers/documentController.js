import prisma from '../lib/prisma.js';
import { validateUploadedFile } from '../utils/fileValidation.js';
import { parseImageUpload } from '../utils/parseImageUpload.js';
import {
  isPhotoDocument,
  photoDocumentOrderBy,
  photoDocumentSelect,
} from '../utils/photoDocuments.js';
import { deleteStoredFile, persistKittenFile, isStoredFileUrl, resolveStoredFileAbsolutePath } from '../utils/fileStorage.js';
import { generateThumbnailFromBuffer, generateThumbnailFromUrl } from '../utils/thumbnail.js';
import { invalidateCacheByPrefix } from '../utils/responseCache.js';

const PHOTO_TRANSACTION_OPTIONS = { maxWait: 10000, timeout: 30000 };

async function findKitten(kittenId) {
  return prisma.kitten.findUnique({
    where: { id: kittenId },
    select: { id: true, primaryPhotoUrl: true, createdAt: true },
  });
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

export async function streamDocumentFile(req, res, next) {
  try {
    const kittenId = Number.parseInt(req.params.kittenId, 10);
    const documentId = Number.parseInt(req.params.id, 10);

    const document = await prisma.document.findFirst({
      where: { id: documentId, kittenId },
    });

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    const fileUrl = document.fileUrl || '';
    const fileName = document.fileName || 'document';
    const disposition = `inline; filename*=UTF-8''${encodeURIComponent(fileName)}`;

    if (fileUrl.startsWith('data:')) {
      const match = /^data:([^;,]+);base64,(.+)$/s.exec(fileUrl);
      if (!match) {
        return res.status(404).json({ error: 'File not found' });
      }
      res.setHeader('Content-Type', match[1] || 'application/octet-stream');
      res.setHeader('Content-Disposition', disposition);
      res.setHeader('Cache-Control', 'private, no-store');
      return res.send(Buffer.from(match[2], 'base64'));
    }

    if (isStoredFileUrl(fileUrl)) {
      const absolutePath = resolveStoredFileAbsolutePath(fileUrl);
      if (!absolutePath) {
        return res.status(404).json({ error: 'File not found' });
      }
      const ext = fileUrl.split('.').pop()?.toLowerCase();
      const mimeByExt = {
        jpg: 'image/jpeg',
        jpeg: 'image/jpeg',
        png: 'image/png',
        webp: 'image/webp',
        gif: 'image/gif',
        pdf: 'application/pdf',
      };
      return res.sendFile(absolutePath, {
        headers: {
          'Content-Type': mimeByExt[ext] || 'application/octet-stream',
          'Content-Disposition': disposition,
          'Cache-Control': 'private, no-store',
        },
      }, (err) => {
        if (err && !res.headersSent) {
          res.status(404).json({ error: 'File not found' });
        }
      });
    }

    if (/^https?:\/\//i.test(fileUrl)) {
      res.setHeader('Cache-Control', 'private, no-store');
      return res.redirect(302, fileUrl);
    }

    return res.status(404).json({ error: 'File not found' });
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
    const fileUrl = await persistKittenFile(kittenId, req.file);

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

    const fileUrl = await persistKittenFile(kittenId, upload);
    const setAsPrimary = req.body.setAsPrimary === 'true' || req.body.setAsPrimary === true;
    const [hasPrimaryPhotoDoc, photoCount] = await Promise.all([
      prisma.document.count({ where: { kittenId, isPrimaryPhoto: true } }),
      prisma.document.count({
        where: {
          kittenId,
          OR: [
            { isPrimaryPhoto: true },
            { docType: { in: ['Photo', 'Primary Photo', 'Gallery Photo'] } },
            { fileUrl: { startsWith: 'data:image/' } },
            { fileUrl: { startsWith: '/uploads/' } },
          ],
        },
      }),
    ]);
    const hasPrimary = Boolean(kitten.primaryPhotoUrl) || hasPrimaryPhotoDoc > 0;
    const shouldSetPrimary = setAsPrimary || !hasPrimary;
    const thumbnailUrl = shouldSetPrimary ? await generateThumbnailFromBuffer(upload.buffer) : null;

    const document = await prisma.$transaction(async (tx) => {
      if (shouldSetPrimary) {
        await tx.document.updateMany({
          where: { kittenId },
          data: { isPrimaryPhoto: false },
        });
        await tx.kitten.update({
          where: { id: kittenId },
          data: { primaryPhotoUrl: fileUrl, thumbnailUrl },
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
    }, PHOTO_TRANSACTION_OPTIONS);

    if (shouldSetPrimary) {
      // Bust cached public kittens list/stats - primaryPhotoUrl just changed
      invalidateCacheByPrefix('public-kittens');
      invalidateCacheByPrefix('public-stats');
    }

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

    const thumbnailUrl = await generateThumbnailFromUrl(document.fileUrl);

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
        data: { primaryPhotoUrl: document.fileUrl, thumbnailUrl },
      });
    }, PHOTO_TRANSACTION_OPTIONS);

    // Bust cached public kittens list/stats - primaryPhotoUrl just changed
    invalidateCacheByPrefix('public-kittens');
    invalidateCacheByPrefix('public-stats');

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
    await deleteStoredFile(document.fileUrl);

    if (wasPrimary && kitten) {
      const nextPhoto = await prisma.document.findFirst({
        where: { kittenId },
        orderBy: photoDocumentOrderBy(),
      });

      const nextPrimary = nextPhoto && isPhotoDocument(nextPhoto) ? nextPhoto : null;
      const nextThumbnailUrl = nextPrimary
        ? await generateThumbnailFromUrl(nextPrimary.fileUrl)
        : null;

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
            data: { primaryPhotoUrl: nextPrimary.fileUrl, thumbnailUrl: nextThumbnailUrl },
          });
        } else {
          await tx.kitten.update({
            where: { id: kittenId },
            data: { primaryPhotoUrl: null, thumbnailUrl: null },
          });
        }
      }, PHOTO_TRANSACTION_OPTIONS);

      // Bust cached public kittens list/stats - primaryPhotoUrl just changed
      invalidateCacheByPrefix('public-kittens');
      invalidateCacheByPrefix('public-stats');
    }

    res.status(204).send();
  } catch (error) {
    next(error);
  }
}
