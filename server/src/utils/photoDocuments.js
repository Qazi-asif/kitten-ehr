const PHOTO_DOC_TYPES = ['Photo', 'Primary Photo', 'Gallery Photo'];

export function isPhotoDocument(document) {
  if (!document) return false;
  if (document.isPrimaryPhoto) return true;
  if (PHOTO_DOC_TYPES.some((type) => document.docType?.includes(type))) return true;
  if (document.fileUrl?.startsWith('data:image/')) return true;
  return /\.(jpg|jpeg|png|webp|gif)$/i.test(document.fileUrl || '');
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
    isPrimaryPhoto: true,
    sortOrder: true,
    uploadedAt: true,
  };
}
