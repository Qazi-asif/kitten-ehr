// Gallery photos are marked kind=PHOTO at upload time. Documents (including
// image files uploaded on the Documents tab) stay kind=FILE and never enter
// the gallery — even when the file extension looks like an image.
const IMAGE_EXTENSION_PATTERN = /\.(jpe?g|png|webp|gif|jfif|heic|heif|bmp)$/i;

const LEGACY_PHOTO_DOC_TYPES = new Set(['Photo', 'Primary Photo', 'Gallery Photo']);

function pathForExtensionCheck(value) {
  if (!value || typeof value !== 'string') return '';
  return value.split(/[?#]/)[0];
}

function hasImageExtension(value) {
  return IMAGE_EXTENSION_PATTERN.test(pathForExtensionCheck(value));
}

export function isPhotoDocument(document) {
  if (!document) return false;
  if (document.kind === 'PHOTO') return true;
  if (document.kind === 'FILE') return false;

  // Legacy rows before kind existed: only explicit photo uploads / primary.
  if (document.isPrimaryPhoto) return true;
  if (LEGACY_PHOTO_DOC_TYPES.has(String(document.docType || '').trim())) {
    return (
      document.fileUrl?.startsWith('data:image/')
      || hasImageExtension(document.fileUrl)
      || hasImageExtension(document.fileName)
    );
  }
  return false;
}

export function photoDocumentOrderBy() {
  return [{ isPrimaryPhoto: 'desc' }, { sortOrder: 'asc' }, { uploadedAt: 'desc' }];
}

export function photoDocumentSelect() {
  return {
    id: true,
    fileName: true,
    fileUrl: true,
    docType: true,
    kind: true,
    isPrimaryPhoto: true,
    sortOrder: true,
    uploadedAt: true,
  };
}
