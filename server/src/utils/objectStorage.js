import { DeleteObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';

let cachedClient = null;
let cachedConfigKey = '';

function readConfig() {
  const bucket = process.env.S3_BUCKET?.trim();
  const accessKeyId = process.env.S3_ACCESS_KEY_ID?.trim() || process.env.AWS_ACCESS_KEY_ID?.trim();
  const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY?.trim() || process.env.AWS_SECRET_ACCESS_KEY?.trim();

  if (!bucket || !accessKeyId || !secretAccessKey) {
    return null;
  }

  return {
    bucket,
    region: process.env.S3_REGION?.trim() || process.env.AWS_REGION?.trim() || 'auto',
    endpoint: process.env.S3_ENDPOINT?.trim() || undefined,
    publicUrlBase: process.env.S3_PUBLIC_URL?.trim()?.replace(/\/$/, '') || '',
    accessKeyId,
    secretAccessKey,
  };
}

function getClient(config) {
  const configKey = `${config.bucket}|${config.endpoint}|${config.region}`;
  if (cachedClient && cachedConfigKey === configKey) {
    return cachedClient;
  }

  cachedClient = new S3Client({
    region: config.region,
    endpoint: config.endpoint,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
    forcePathStyle: Boolean(config.endpoint),
  });
  cachedConfigKey = configKey;
  return cachedClient;
}

export function isObjectStorageConfigured() {
  return Boolean(readConfig());
}

export function isObjectStorageUrl(url) {
  if (!url || typeof url !== 'string' || !url.startsWith('http')) return false;

  const config = readConfig();
  if (!config) return false;
  if (config.publicUrlBase && url.startsWith(`${config.publicUrlBase}/`)) return true;

  return /\/(kittens|applications)\/\d+\//.test(url);
}

export function extractObjectKey(fileUrl) {
  const config = readConfig();
  if (!config || !fileUrl) return null;

  if (config.publicUrlBase && fileUrl.startsWith(`${config.publicUrlBase}/`)) {
    return fileUrl.slice(config.publicUrlBase.length + 1);
  }

  try {
    const pathname = new URL(fileUrl).pathname.replace(/^\//, '');
    if (pathname.startsWith(`${config.bucket}/`)) {
      return pathname.slice(config.bucket.length + 1);
    }
    if (/\/(kittens|applications)\/\d+\//.test(pathname)) {
      return pathname;
    }
  } catch {
    return null;
  }

  return null;
}

export async function uploadToObjectStorage(key, buffer, contentType) {
  const config = readConfig();
  if (!config) {
    throw new Error('Object storage is not configured');
  }

  const client = getClient(config);
  await client.send(new PutObjectCommand({
    Bucket: config.bucket,
    Key: key,
    Body: buffer,
    ContentType: contentType,
  }));

  if (config.publicUrlBase) {
    return `${config.publicUrlBase}/${key}`;
  }

  if (config.endpoint) {
    return `${config.endpoint.replace(/\/$/, '')}/${config.bucket}/${key}`;
  }

  return `https://${config.bucket}.s3.${config.region}.amazonaws.com/${key}`;
}

export async function deleteFromObjectStorage(fileUrl) {
  const config = readConfig();
  if (!config) return;

  const key = extractObjectKey(fileUrl);
  if (!key) return;

  const client = getClient(config);
  await client.send(new DeleteObjectCommand({
    Bucket: config.bucket,
    Key: key,
  })).catch(() => {});
}
