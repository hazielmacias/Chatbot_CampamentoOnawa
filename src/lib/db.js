import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis;

let prisma;

if (process.env.NODE_ENV === 'production') {
  prisma = new PrismaClient({
    log: ['error']
  });
} else {
  prisma = globalForPrisma.prisma || new PrismaClient({
    log: ['query', 'error', 'warn']
  });
  globalForPrisma.prisma = prisma;
}

export default prisma;