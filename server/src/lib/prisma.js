import { PrismaClient } from '../generated/prisma/index.js';

const globalForPrisma = globalThis;

// Cap Prisma's client-side pool so Hostinger + Neon don't open dozens of
// connections from one Passenger process (or leftover hot-reload clients).
function databaseUrlWithPoolLimit(rawUrl, limit = 5) {
  if (!rawUrl) return rawUrl;
  try {
    const url = new URL(rawUrl);
    if (!url.searchParams.has('connection_limit')) {
      url.searchParams.set('connection_limit', String(limit));
    }
    if (!url.searchParams.has('pool_timeout')) {
      url.searchParams.set('pool_timeout', '10');
    }
    if (!url.searchParams.has('connect_timeout')) {
      url.searchParams.set('connect_timeout', '10');
    }
    return url.href;
  } catch {
    return rawUrl;
  }
}

// Reuse the PrismaClient instance across hot-reloads in dev and across
// invocations within the same serverless container on Vercel. Without this,
// every cold-start or module reload creates a new connection pool, exhausting
// DB connections quickly and adding latency.
const prisma = globalForPrisma.prisma ?? new PrismaClient({
  datasources: {
    db: { url: databaseUrlWithPoolLimit(process.env.DATABASE_URL) },
  },
  log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
});

globalForPrisma.prisma = prisma;

export default prisma;
