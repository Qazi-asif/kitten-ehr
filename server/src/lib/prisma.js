import { PrismaClient } from '../generated/prisma/index.js';

const globalForPrisma = globalThis;

// Reuse the PrismaClient instance across hot-reloads in dev and across
// invocations within the same serverless container on Vercel. Without this,
// every cold-start or module reload creates a new connection pool, exhausting
// DB connections quickly and adding latency.
const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
});

globalForPrisma.prisma = prisma;

export default prisma;
