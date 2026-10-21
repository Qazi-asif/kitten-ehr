import fs from 'fs/promises';
import { isStoredFileUrl, resolveStoredFileAbsolutePath } from './fileStorage.js';

/**
 * Load a stored kitten/document file into a Buffer for email attachments.
 * Supports data URLs, local /uploads paths, and remote/object-storage URLs.
 */
export async function loadFileBytes(fileUrl) {
  if (!fileUrl || typeof fileUrl !== 'string') return null;

  if (fileUrl.startsWith('data:')) {
    const match = /^data:([^;,]+);base64,(.+)$/s.exec(fileUrl);
    if (!match) return null;
    return {
      content: Buffer.from(match[2], 'base64'),
      contentType: match[1] || 'application/octet-stream',
    };
  }

  if (isStoredFileUrl(fileUrl)) {
    const absolutePath = resolveStoredFileAbsolutePath(fileUrl);
    if (!absolutePath) return null;
    try {
      const content = await fs.readFile(absolutePath);
      return { content };
    } catch {
      return null;
    }
  }

  if (/^https?:\/\//i.test(fileUrl)) {
    const response = await fetch(fileUrl);
    if (!response.ok) return null;
    const content = Buffer.from(await response.arrayBuffer());
    const contentType = response.headers.get('content-type') || undefined;
    return { content, contentType };
  }

  return null;
}
