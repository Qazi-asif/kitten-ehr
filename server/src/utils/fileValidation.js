const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'application/pdf']);
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;

export function validateUploadedFile(file) {
  if (!file) {
    return { ok: false, status: 400, error: 'No file uploaded' };
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return { ok: false, status: 413, error: 'File too large. Max 5MB.' };
  }

  if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
    return {
      ok: false,
      status: 400,
      error: 'Invalid file type. Only JPEG, PNG, and PDF files are allowed.',
    };
  }

  return { ok: true };
}
