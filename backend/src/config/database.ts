// ============================================================================
// HMS Backend - Prisma Database Client
// Singleton pattern with connection pooling for Neon DB
// ============================================================================

import { PrismaClient } from '@prisma/client';
import { env } from './env.js';

// Singleton instance
const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClient | undefined;
};

// Create Prisma client with logging based on environment
export const prisma =
    globalForPrisma.prisma ??
    new PrismaClient({
        log:
            env.NODE_ENV === 'development'
                ? ['query', 'info', 'warn', 'error']
                : ['error'],
        datasources: {
            db: {
                url: env.DATABASE_URL,
            },
        },
    });

// Prevent multiple instances in development
if (env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = prisma;
}

// Graceful shutdown
export const disconnectPrisma = async (): Promise<void> => {
    await prisma.$disconnect();
};

export default prisma;
