import { PrismaClient } from '../generated/prisma/index.js';

const globalForPrisma = globalThis;

const prisma = globalForPrisma.prisma ?? new PrismaClient();

globalForPrisma.prisma = prisma;

export default prisma;
