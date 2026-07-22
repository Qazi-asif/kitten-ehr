import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import { PrismaClient } from '../generated/prisma/index.js';

const globalForPrisma = globalThis;

// Cap the pg pool so Hostinger + Neon don't open dozens of connections from
// one Passenger process. Prisma's Rust engine used connection_limit in the
// URL; with the JS driver adapter the pool lives here instead.
function createPool(rawUrl, max = 5) {
  if (!rawUrl) {
    throw new Error('DATABASE_URL is not defined');
  }

  let connectionString = rawUrl;
  try {
    const url = new URL(rawUrl);
    // Prisma-engine pool knobs are meaningless to node-pg; drop them.
    url.searchParams.delete('connection_limit');
    url.searchParams.delete('pool_timeout');
    if (!url.searchParams.has('connect_timeout')) {
      url.searchParams.set('connect_timeout', '10');
    }
    connectionString = url.href;
  } catch {
    connectionString = rawUrl;
  }

  return new pg.Pool({
    connectionString,
    max,
    idleTimeoutMillis: 20_000,
    connectionTimeoutMillis: 10_000,
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
