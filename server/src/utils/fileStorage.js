import fs from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';
import { fileURLToPath } from 'url';
import {
  deleteFromObjectStorage,
  isObjectStorageConfigured,
  isObjectStorageUrl,
  uploadToObjectStorage,
} from './objectStorage.js';

const UPLOAD_ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '../../uploads');

const MIME_EXTENSIONS = {
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
  'application/pdf': '.pdf',
};

function extensionForFile(originalName, mimeType) {
  // Prefer MIME → extension so a claimed image/jpeg named "x.html" cannot
  // land as a publicly served .html under /uploads.
  const fromMime = MIME_EXTENSIONS[mimeType];
  if (fromMime) return fromMime;
  const fromName = path.extname(originalName || '').toLowerCase();
  if (fromName && Object.values(MIME_EXTENSIONS).includes(fromName)) {
    return fromName;
  }
  return '';
}

export function getUploadRoot() {
  return UPLOAD_ROOT;
}

export function isStoredFileUrl(url) {
  return typeof url === 'string' && url.startsWith('/uploads/');
}

export function isManagedFileUrl(url) {
  return isStoredFileUrl(url) || isObjectStorageUrl(url);
}

export async function saveKittenFile(kittenId, buffer, originalName, mimeType) {
  const ext = extensionForFile(originalName, mimeType);
  const safeName = `${randomUUID()}${ext}`;
  const dir = path.join(UPLOAD_ROOT, 'kittens', String(kittenId));
  await fs.mkdir(dir, { recursive: true });
  const absolutePath = path.join(dir, safeName);
  await fs.writeFile(absolutePath, buffer);
  return `/uploads/kittens/${kittenId}/${safeName}`;
}

export async function saveApplicationFile(applicationId, buffer, originalName, mimeType) {
  const ext = extensionForFile(originalName, mimeType);
  const safeName = `${randomUUID()}${ext}`;
  const dir = path.join(UPLOAD_ROOT, 'applications', String(applicationId));
  await fs.mkdir(dir, { recursive: true });
  const absolutePath = path.join(dir, safeName);
  await fs.writeFile(absolutePath, buffer);
  return `/uploads/applications/${applicationId}/${safeName}`;
}

async function persistScopedFile(scope, scopeId, file) {
  const ext = extensionForFile(file.originalname, file.mimetype);
  const key = `${scope}/${scopeId}/${randomUUID()}${ext}`;

  if (isObjectStorageConfigured()) {
    return uploadToObjectStorage(key, file.buffer, file.mimetype);
  }

  if (shouldUseDiskStorage()) {
    if (scope === 'kittens') {
      return saveKittenFile(scopeId, file.buffer, file.originalname, file.mimetype);
    }
    return saveApplicationFile(scopeId, file.buffer, file.originalname, file.mimetype);
  }

  // Never embed multi-MB base64 blobs in Postgres — that balloons RAM on every
  // list/detail read and is a primary Hostinger OOM vector. Require R2/S3
  // (or local disk outside Vercel) instead.
  const err = new Error(
    'File storage is not configured. Set S3/R2 env vars (S3_BUCKET, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY, S3_PUBLIC_URL) or run on a host with local disk uploads.',
  );
  err.status = 503;
  throw err;
}

export async function deleteStoredFile(fileUrl) {
  if (isStoredFileUrl(fileUrl)) {
    const relative = fileUrl.replace(/^\/uploads\//, '');
    const absolutePath = path.resolve(UPLOAD_ROOT, relative);
    const rootResolved = path.resolve(UPLOAD_ROOT);
    if (!absolutePath.startsWith(rootResolved + path.sep) && absolutePath !== rootResolved) {
      console.warn('[fileStorage] Refused delete outside upload root:', fileUrl);
      return;
    }
    await fs.unlink(absolutePath).catch(() => {});
    return;
  }

  if (isObjectStorageUrl(fileUrl)) {
    await deleteFromObjectStorage(fileUrl);
  }
}

export function shouldUseDiskStorage() {
  return !process.env.VERCEL;
}

export async function persistKittenFile(kittenId, file) {
  return persistScopedFile('kittens', kittenId, file);
}

export async function persistApplicationFile(applicationId, file) {
  return persistScopedFile('applications', applicationId, file);
}
