import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import { PrismaClient } from '../generated/prisma/index.js';

const globalForPrisma = globalThis;

function createPool(rawUrl, max = 5) {
  if (!rawUrl) {
    throw new Error('DATABASE_URL is not defined');
  }

  let connectionString = rawUrl;
  let needsSsl = false;
  try {
    const url = new URL(rawUrl);
    // Prisma-engine pool knobs are meaningless to node-pg; drop them.
    url.searchParams.delete('connection_limit');
    url.searchParams.delete('pool_timeout');
    if (!url.searchParams.has('connect_timeout')) {
      url.searchParams.set('connect_timeout', '10');
    }
    const sslMode = (url.searchParams.get('sslmode') || '').toLowerCase();
    needsSsl = sslMode === 'require'
      || sslMode === 'verify-full'
      || sslMode === 'verify-ca'
      || url.hostname.includes('neon.tech');
    connectionString = url.href;
  } catch {
    connectionString = rawUrl;
    needsSsl = /neon\.tech|sslmode=require/i.test(rawUrl);
  }

  return new pg.Pool({
    connectionString,
    max,
    idleTimeoutMillis: 20_000,
    connectionTimeoutMillis: 10_000,
    // Neon (and many hosted Postgres) require TLS; node-pg does not always
    // honor sslmode= from the URL alone on every host/runtime.
    ...(needsSsl ? { ssl: { rejectUnauthorized: false } } : {}),
  });
}

export function createPrismaClient() {
  const pool = createPool(process.env.DATABASE_URL, 5);
  const adapter = new PrismaPg(pool);
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });
}

// Reuse across hot-reloads in dev and within the same Passenger/Node process.
const prisma = globalForPrisma.prisma ?? createPrismaClient();
globalForPrisma.prisma = prisma;

export default prisma;
