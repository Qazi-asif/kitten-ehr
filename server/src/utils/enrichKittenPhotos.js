import prisma from '../lib/prisma.js';
import { isPhotoDocument, photoDocumentOrderBy } from './photoDocuments.js';
import {
  GENERIC_KITTEN_PHOTO_FALLBACK,
  isResolvablePhotoUrl,
  normalizeKittenPhotoUrl,
} from './resolveKittenPhotoUrl.js';

export async function enrichKittensWithPhotos(kittens, { allowNameFallback = false } = {}) {
  if (!kittens.length) return kittens;

  const needsDocLookup = kittens.filter((kitten) => !isResolvablePhotoUrl(kitten.primaryPhotoUrl));
  const photoByKittenId = new Map();

  if (needsDocLookup.length > 0) {
    const documents = await prisma.document.findMany({
      where: { kittenId: { in: needsDocLookup.map((kitten) => kitten.id) } },
      orderBy: photoDocumentOrderBy(),
      select: { kittenId: true, fileUrl: true, docType: true, isPrimaryPhoto: true },
    });

    for (const document of documents) {
      if (photoByKittenId.size === needsDocLookup.length) break;
      if (!isPhotoDocument(document)) continue;
      if (!photoByKittenId.has(document.kittenId)) {
        photoByKittenId.set(document.kittenId, document.fileUrl);
      }
    }
  }

  return kittens.map((kitten) => {
    const rawPrimary = kitten.primaryPhotoUrl;
    const strippedPrimary = rawPrimary?.startsWith('data:') ? null : rawPrimary;
    const normalized = normalizeKittenPhotoUrl(
      strippedPrimary,
      allowNameFallback ? kitten.name : '',
    );

    if (normalized) {
      return { ...kitten, primaryPhotoUrl: normalized, hasPrimaryPhoto: true };
    }

    const documentPhoto = photoByKittenId.get(kitten.id);
    if (documentPhoto) {
      return { ...kitten, primaryPhotoUrl: documentPhoto, hasPrimaryPhoto: true };
    }

    const hasPrimaryPhoto = Boolean(rawPrimary);

    return {
      ...kitten,
      primaryPhotoUrl: allowNameFallback
        ? normalizeKittenPhotoUrl(null, kitten.name) || GENERIC_KITTEN_PHOTO_FALLBACK
        : null,
      hasPrimaryPhoto,
    };
  });
}
