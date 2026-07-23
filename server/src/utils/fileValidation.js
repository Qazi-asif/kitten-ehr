const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/heic',
  'image/heif',
  'application/pdf',
]);
const ALLOWED_EXTENSIONS = new Set([
  '.jpg',
  '.jpeg',
  '.png',
  '.webp',
  '.gif',
  '.heic',
  '.heif',
  '.pdf',
]);
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;

function hasAllowedExtension(fileName = '') {
  const match = /\.[^.]+$/.exec(fileName.toLowerCase());
  return Boolean(match && ALLOWED_EXTENSIONS.has(match[0]));
}

export function validateUploadedFile(file) {
  if (!file) {
    return { ok: false, status: 400, error: 'No file uploaded' };
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return { ok: false, status: 413, error: 'File too large. Max 5MB.' };
  }

  const mime = (file.mimetype || '').toLowerCase();
  // iOS often sends HEIC with an empty or generic MIME type — fall back to extension.
  if (!ALLOWED_MIME_TYPES.has(mime) && !hasAllowedExtension(file.originalname)) {
    return {
      ok: false,
      status: 400,
      error: 'Invalid file type. Only JPEG, PNG, HEIC, and PDF files are allowed.',
    };
  }

  return { ok: true };
}
