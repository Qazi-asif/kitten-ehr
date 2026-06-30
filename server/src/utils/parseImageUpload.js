export function parseImageUpload(req) {
  if (req.file?.buffer) {
    return {
      buffer: req.file.buffer,
      mimetype: req.file.mimetype,
      originalname: req.file.originalname,
      size: req.file.size,
    };
  }

  const { imageData, fileName, mimeType } = req.body || {};
  if (!imageData || typeof imageData !== 'string') {
    return null;
  }

  const dataUrlMatch = imageData.match(/^data:([^;]+);base64,(.+)$/);
  if (dataUrlMatch) {
    const buffer = Buffer.from(dataUrlMatch[2], 'base64');
    return {
      buffer,
      mimetype: mimeType || dataUrlMatch[1],
      originalname: fileName || 'photo.jpg',
      size: buffer.length,
    };
  }

  const buffer = Buffer.from(imageData, 'base64');
  return {
    buffer,
    mimetype: mimeType || 'image/jpeg',
    originalname: fileName || 'photo.jpg',
    size: buffer.length,
  };
}
