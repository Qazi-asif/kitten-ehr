import fs from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';
import { fileURLToPath } from 'url';
import { pipeline } from 'stream/promises';
import { Readable } from 'stream';
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
  'image/heic': '.heic',
  'image/heif': '.heif',
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

/** Resolve a /uploads/... URL to an absolute path confined under UPLOAD_ROOT, or null. */
export function resolveStoredFileAbsolutePath(fileUrl) {
  if (!isStoredFileUrl(fileUrl)) return null;
  const relative = fileUrl.replace(/^\/uploads\//, '');
  const absolutePath = path.resolve(UPLOAD_ROOT, relative);
  const rootResolved = path.resolve(UPLOAD_ROOT);
  if (!absolutePath.startsWith(rootResolved + path.sep) && absolutePath !== rootResolved) {
    return null;
  }
  return absolutePath;
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

export async function saveEventFile(eventId, buffer, originalName, mimeType) {
  const ext = extensionForFile(originalName, mimeType);
  const safeName = `${randomUUID()}${ext}`;
  const dir = path.join(UPLOAD_ROOT, 'events', String(eventId));
  await fs.mkdir(dir, { recursive: true });
  const absolutePath = path.join(dir, safeName);
  await fs.writeFile(absolutePath, buffer);
  return `/uploads/events/${eventId}/${safeName}`;
}

// Writes go to object storage when it is configured, otherwise to local disk
// under UPLOAD_ROOT. Base64-in-Postgres is never written: multi-MB blobs balloon
// RAM on every list/detail read and are a primary Hostinger OOM vector. Rows
// created before that rule still hold base64 data URLs, so the read paths
// (documentController, applicationController, publicController, thumbnail) keep
// decoding them.
async function persistScopedFile(scope, scopeId, file) {
  const ext = extensionForFile(file.originalname, file.mimetype);
  const key = `${scope}/${scopeId}/${randomUUID()}${ext}`;

  if (isObjectStorageConfigured()) {
    return uploadToObjectStorage(key, file.buffer, file.mimetype);
  }

  if (scope === 'kittens') {
    return saveKittenFile(scopeId, file.buffer, file.originalname, file.mimetype);
  }
  if (scope === 'events') {
    return saveEventFile(scopeId, file.buffer, file.originalname, file.mimetype);
  }
  return saveApplicationFile(scopeId, file.buffer, file.originalname, file.mimetype);
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

// CR-94: staff viewing an S3/R2-backed upload previously hit
// `res.redirect(302, fileUrl)` — the browser's own authenticated `fetch()`
// then had to follow a cross-origin redirect itself, which the app's CSP
// `connect-src` (and often the bucket's CORS policy) blocks outright,
// surfacing as a bare "Failed to fetch". Fetching the bytes server-side and
// streaming them back through the same authenticated, same-origin response
// keeps every storage backend (disk, base64, S3/R2) working identically.
export async function streamRemoteFile(res, fileUrl, { contentType, disposition } = {}) {
  const upstream = await fetch(fileUrl);
  if (!upstream.ok || !upstream.body) {
    const err = new Error('File not found');
    err.status = 404;
    throw err;
  }

  res.setHeader('Content-Type', contentType || upstream.headers.get('content-type') || 'application/octet-stream');
  if (disposition) res.setHeader('Content-Disposition', disposition);
  res.setHeader('Cache-Control', 'private, no-store');
  const contentLength = upstream.headers.get('content-length');
  if (contentLength) res.setHeader('Content-Length', contentLength);

  await pipeline(Readable.fromWeb(upstream.body), res);
}

export async function persistKittenFile(kittenId, file) {
  return persistScopedFile('kittens', kittenId, file);
}

export async function persistApplicationFile(applicationId, file) {
  return persistScopedFile('applications', applicationId, file);
}

export async function persistEventFile(eventId, file) {
  return persistScopedFile('events', eventId, file);
}
