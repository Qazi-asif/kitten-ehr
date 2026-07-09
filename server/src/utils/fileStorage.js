import fs from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';
import { fileURLToPath } from 'url';

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
  const fromName = path.extname(originalName || '');
  if (fromName) return fromName.toLowerCase();
  return MIME_EXTENSIONS[mimeType] || '';
}

export function getUploadRoot() {
  return UPLOAD_ROOT;
}

export function isStoredFileUrl(url) {
  return typeof url === 'string' && url.startsWith('/uploads/');
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

export async function deleteStoredFile(fileUrl) {
  if (!isStoredFileUrl(fileUrl)) return;
  const relative = fileUrl.replace(/^\/uploads\//, '');
  const absolutePath = path.join(UPLOAD_ROOT, relative);
  await fs.unlink(absolutePath).catch(() => {});
}

export function shouldUseDiskStorage() {
  return !process.env.VERCEL;
}

export async function persistKittenFile(kittenId, file) {
  if (shouldUseDiskStorage()) {
    return saveKittenFile(kittenId, file.buffer, file.originalname, file.mimetype);
  }
  return `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
}

export async function persistApplicationFile(applicationId, file) {
  if (shouldUseDiskStorage()) {
    return saveApplicationFile(applicationId, file.buffer, file.originalname, file.mimetype);
  }
  return `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
}
