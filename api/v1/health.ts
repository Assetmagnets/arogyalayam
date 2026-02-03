import type { VercelRequest, VercelResponse } from '@vercel/node';
import { PrismaClient } from '@prisma/client';

// Prisma singleton
declare global {
    var prisma: PrismaClient | undefined;
}
const prisma = global.prisma || new PrismaClient();
if (process.env.NODE_ENV !== 'production') {
    global.prisma = prisma;
}

function setCorsHeaders(res: VercelResponse) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    setCorsHeaders(res);

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        await prisma.$queryRaw`SELECT 1`;
        return res.status(200).json({
            success: true,
            data: {
                status: 'healthy',
                database: 'connected',
                timestamp: new Date().toISOString(),
                hasDbUrl: !!process.env.DATABASE_URL,
                hasJwtSecret: !!process.env.JWT_SECRET,
            },
        });
    } catch (error: any) {
        return res.status(503).json({
            success: false,
            data: {
                status: 'unhealthy',
                database: 'disconnected',
                error: error?.message,
                timestamp: new Date().toISOString(),
                hasDbUrl: !!process.env.DATABASE_URL,
            },
        });
    }
}
