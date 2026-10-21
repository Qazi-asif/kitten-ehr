import { createHash } from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';
import { formatExternalId } from '../utils/kittenScope.js';
import { isPhotoDocument, photoDocumentOrderBy } from '../utils/photoDocuments.js';
import { isStoredFileUrl, resolveStoredFileAbsolutePath } from '../utils/fileStorage.js';
import { loadFileBytes } from '../utils/loadFileBytes.js';
import prisma from '../lib/prisma.js';

const CDN_ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '../../uploads/cdn/cats');
const MIN_LONG_EDGE = 1200;

export function publicCdnBaseUrl() {
  const base = (process.env.PUBLIC_BASE_URL || process.env.PUBLIC_SITE_URL || '').replace(/\/$/, '');
  return base || '';
}

export function cdnPathFor(externalId, hash) {
  return `/cdn/cats/${externalId}/${hash}.jpg`;
}

export function cdnAbsoluteUrl(externalId, hash) {
  const base = publicCdnBaseUrl();
  const rel = cdnPathFor(externalId, hash);
  return base ? `${base}${rel}` : rel;
}

async function jpegAtLeast1200(buffer) {
  const image = sharp(buffer, { failOn: 'none' }).rotate();
  const meta = await image.metadata();
  const width = meta.width || 0;
  const height = meta.height || 0;
  const longEdge = Math.max(width, height);
  const pipeline = longEdge > 0 && longEdge < MIN_LONG_EDGE
    ? image.resize({
      width: width >= height ? MIN_LONG_EDGE : undefined,
      height: height > width ? MIN_LONG_EDGE : undefined,
      fit: 'inside',
      withoutEnlargement: false,
    })
    : image;
  return pipeline.jpeg({ quality: 86 }).toBuffer();
}

export async function ensureCdnPhotosForKitten(kitten) {
  const externalId = kitten.externalId || formatExternalId(kitten.id);
  const documents = await prisma.document.findMany({
    where: { kittenId: kitten.id },
    orderBy: photoDocumentOrderBy(),
  });
  const photos = documents.filter(isPhotoDocument).slice(0, 4);
  const urls = [];

  const dir = path.join(CDN_ROOT, externalId);
  await fs.mkdir(dir, { recursive: true });

  const sources = [];
  if (kitten.primaryPhotoUrl) sources.push(kitten.primaryPhotoUrl);
  for (const photo of photos) {
    if (photo.fileUrl && !sources.includes(photo.fileUrl)) sources.push(photo.fileUrl);
  }

  for (const source of sources.slice(0, 4)) {
    let bytes = null;
    if (isStoredFileUrl(source)) {
      const abs = resolveStoredFileAbsolutePath(source);
      if (abs) bytes = { content: await fs.readFile(abs).catch(() => null) };
    }
    if (!bytes?.content) bytes = await loadFileBytes(source);
    if (!bytes?.content) continue;

    try {
      const jpeg = await jpegAtLeast1200(bytes.content);
      const hash = createHash('sha1').update(jpeg).digest('hex').slice(0, 4);
      const filePath = path.join(dir, `${hash}.jpg`);
      await fs.writeFile(filePath, jpeg);
      urls.push(cdnAbsoluteUrl(externalId, hash));
    } catch {
      // Skip unreadable images rather than failing the whole snapshot.
    }
  }

  return urls;
}

export function resolveCdnFile(externalId, fileName) {
  if (!/^[A-Za-z0-9._-]+$/.test(externalId || '')) return null;
  if (!/^[a-f0-9]{4}\.jpg$/i.test(fileName || '')) return null;
  const absolute = path.resolve(CDN_ROOT, externalId, fileName);
  const root = path.resolve(CDN_ROOT);
  if (!absolute.startsWith(root + path.sep)) return null;
  return absolute;
}
