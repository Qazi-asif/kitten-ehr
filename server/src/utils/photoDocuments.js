// Classify gallery photos by what the file is — never by free-text docType.
// Substring matching on docType (e.g. includes "Photo") pulled non-image
// uploads like "Photo ID" into the gallery. No MIME column on Document;
// upload paths set fileUrl/fileName extensions from the real MIME type.
const IMAGE_EXTENSION_PATTERN = /\.(jpe?g|png|webp|gif|jfif|heic|heif|bmp)$/i;

function pathForExtensionCheck(value) {
  if (!value || typeof value !== 'string') return '';
  return value.split(/[?#]/)[0];
}

function hasImageExtension(value) {
  return IMAGE_EXTENSION_PATTERN.test(pathForExtensionCheck(value));
}

export function isPhotoDocument(document) {
  if (!document) return false;
  if (document.isPrimaryPhoto) return true;
  if (document.fileUrl?.startsWith('data:image/')) return true;
  return hasImageExtension(document.fileUrl) || hasImageExtension(document.fileName);
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
