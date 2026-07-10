import fs from 'fs/promises';
import path from 'path';
import sharp from 'sharp';
import { getUploadRoot } from './fileStorage.js';

const THUMBNAIL_SIZE = 128;
const THUMBNAIL_QUALITY = 70;

/**
 * Resizes an image buffer down to a small square JPEG thumbnail and returns
 * it as an inline base64 data URL, sized to stay well under a few KB so it's
 * safe to include directly in list-view API responses.
 */
export async function generateThumbnailFromBuffer(buffer) {
  if (!buffer) return null;

  try {
    const resized = await sharp(buffer)
      .resize(THUMBNAIL_SIZE, THUMBNAIL_SIZE, { fit: 'cover' })
      .jpeg({ quality: THUMBNAIL_QUALITY })
      .toBuffer();

    return `data:image/jpeg;base64,${resized.toString('base64')}`;
  } catch (error) {
    console.warn('[thumbnail] Failed to generate thumbnail from buffer:', error.message);
    return null;
  }
}

async function loadImageBuffer(fileUrl) {
  if (!fileUrl) return null;

  if (fileUrl.startsWith('data:')) {
    const match = fileUrl.match(/^data:[^;]+;base64,(.+)$/);
    if (!match) return null;
    return Buffer.from(match[1], 'base64');
  }

  if (fileUrl.startsWith('/uploads/')) {
    try {
      const relative = fileUrl.replace(/^\/uploads\//, '');
      const absolutePath = path.join(getUploadRoot(), relative);
      return await fs.readFile(absolutePath);
    } catch (error) {
      console.warn('[thumbnail] Failed to read stored file for thumbnail:', error.message);
      return null;
    }
  }

  if (fileUrl.startsWith('http://') || fileUrl.startsWith('https://')) {
    try {
      const response = await fetch(fileUrl);
      if (!response.ok) return null;
      const arrayBuffer = await response.arrayBuffer();
      return Buffer.from(arrayBuffer);
    } catch (error) {
      console.warn('[thumbnail] Failed to fetch remote file for thumbnail:', error.message);
      return null;
    }
  }

  return null;
}

/**
 * Generates a thumbnail data URL from an existing fileUrl reference
 * (inline data: URL, local /uploads/ path, or a remote https:// object
 * storage URL). Returns null if the source can't be read or resized -
 * callers should treat that as "no thumbnail available" rather than fail
 * the request.
 */
export async function generateThumbnailFromUrl(fileUrl) {
  const buffer = await loadImageBuffer(fileUrl);
  if (!buffer) return null;
  return generateThumbnailFromBuffer(buffer);
}
