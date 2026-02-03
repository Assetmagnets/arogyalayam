import type { VercelRequest, VercelResponse } from '@vercel/node';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';

// ============================================================================
// PRISMA CLIENT (Singleton for serverless)
// ============================================================================

declare global {
    var prisma: PrismaClient | undefined;
}

const prisma = global.prisma || new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
    global.prisma = prisma;
}

// ============================================================================
// AUTH CONFIG
// ============================================================================

const JWT_SECRET = process.env.JWT_SECRET || 'hms-dev-secret-change-in-production';
const JWT_EXPIRES_IN = '24h';

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const LoginSchema = z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(1, 'Password is required'),
});

// ============================================================================
// CORS HEADERS
// ============================================================================

function setCorsHeaders(res: VercelResponse) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

// ============================================================================
// AUTH MIDDLEWARE
// ============================================================================

interface JWTPayload {
    userId: string;
    email: string;
    hospitalId: string;
}

function verifyToken(req: VercelRequest): JWTPayload | null {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader?.startsWith('Bearer ')) {
            return null;
        }
        const token = authHeader.substring(7);
        return jwt.verify(token, JWT_SECRET) as JWTPayload;
    } catch {
        return null;
    }
}

// ============================================================================
// ROUTE HANDLERS
// ============================================================================

async function handleHealth(res: VercelResponse) {
    try {
        await prisma.$queryRaw`SELECT 1`;
        return res.status(200).json({
            success: true,
            data: {
                status: 'healthy',
                database: 'connected',
                timestamp: new Date().toISOString(),
            },
        });
    } catch {
        return res.status(503).json({
            success: false,
            data: {
                status: 'unhealthy',
                database: 'disconnected',
                timestamp: new Date().toISOString(),
            },
        });
    }
}

async function handleLogin(req: VercelRequest, res: VercelResponse) {
    try {
        const validation = LoginSchema.safeParse(req.body);
        if (!validation.success) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'VALIDATION_ERROR',
                    message: 'Invalid request data',
                    details: validation.error.flatten(),
                },
            });
        }

        const { email, password } = validation.data;

        // Find user
        const user = await prisma.user.findUnique({
            where: { email },
            include: {
                role: {
                    include: {
                        permissions: {
                            include: { permission: true }
                        }
                    }
                }
            }
        });

        if (!user) {
            return res.status(401).json({
                success: false,
                error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' }
            });
        }

        // Check password
        const isValid = await bcrypt.compare(password, user.passwordHash);
        if (!isValid) {
            return res.status(401).json({
                success: false,
                error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' }
            });
        }

        // Check status
        if (user.status !== 'ACTIVE') {
            return res.status(403).json({
                success: false,
                error: { code: 'ACCOUNT_INACTIVE', message: 'Account is not active' }
            });
        }

        // Generate token
        const token = jwt.sign(
            {
                userId: user.id,
                email: user.email,
                hospitalId: user.hospitalId,
            },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRES_IN }
        );

        // Update last login
        await prisma.user.update({
            where: { id: user.id },
            data: { lastLoginAt: new Date() }
        });

        // Extract permissions
        const permissions = user.role.permissions.map((rp: any) => rp.permission.name);

        return res.status(200).json({
            success: true,
            data: {
                accessToken: token,
                refreshToken: token,
                user: {
                    id: user.id,
                    email: user.email,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    hospitalId: user.hospitalId,
                    role: user.role.name,
                    permissions,
                },
            },
        });
    } catch (error) {
        console.error('Login error:', error);
        return res.status(500).json({
            success: false,
            error: { code: 'INTERNAL_ERROR', message: 'An error occurred' }
        });
    }
}

async function handleGetMe(req: VercelRequest, res: VercelResponse) {
    const user = verifyToken(req);
    if (!user) {
        return res.status(401).json({
            success: false,
            error: { code: 'UNAUTHORIZED', message: 'Invalid or missing token' }
        });
    }

    try {
        const dbUser = await prisma.user.findUnique({
            where: { id: user.userId },
            include: {
                role: {
                    include: {
                        permissions: {
                            include: { permission: true }
                        }
                    }
                }
            }
        });

        if (!dbUser) {
            return res.status(404).json({
                success: false,
                error: { code: 'USER_NOT_FOUND', message: 'User not found' }
            });
        }

        const permissions = dbUser.role.permissions.map((rp: any) => rp.permission.name);

        return res.status(200).json({
            success: true,
            data: {
                id: dbUser.id,
                email: dbUser.email,
                firstName: dbUser.firstName,
                lastName: dbUser.lastName,
                hospitalId: dbUser.hospitalId,
                role: dbUser.role.name,
                permissions,
                status: dbUser.status,
                lastLoginAt: dbUser.lastLoginAt,
            },
        });
    } catch (error) {
        console.error('Get user error:', error);
        return res.status(500).json({
            success: false,
            error: { code: 'INTERNAL_ERROR', message: 'An error occurred' }
        });
    }
}

async function handleGetPatients(req: VercelRequest, res: VercelResponse) {
    const user = verifyToken(req);
    if (!user) {
        return res.status(401).json({
            success: false,
            error: { code: 'UNAUTHORIZED', message: 'Invalid or missing token' }
        });
    }

    try {
        const patients = await prisma.patient.findMany({
            where: {
                hospitalId: user.hospitalId,
                deletedAt: null
            },
            take: 50,
            orderBy: { createdAt: 'desc' }
        });

        return res.status(200).json({
            success: true,
            data: patients,
            meta: { total: patients.length }
        });
    } catch (error) {
        console.error('Get patients error:', error);
        return res.status(500).json({
            success: false,
            error: { code: 'INTERNAL_ERROR', message: 'An error occurred' }
        });
    }
}

async function handleGetAppointments(req: VercelRequest, res: VercelResponse) {
    const user = verifyToken(req);
    if (!user) {
        return res.status(401).json({
            success: false,
            error: { code: 'UNAUTHORIZED', message: 'Invalid or missing token' }
        });
    }

    try {
        const appointments = await prisma.appointment.findMany({
            where: {
                hospitalId: user.hospitalId,
                deletedAt: null
            },
            include: {
                patient: true,
                doctor: { include: { user: true } }
            },
            take: 50,
            orderBy: { appointmentDate: 'desc' }
        });

        return res.status(200).json({
            success: true,
            data: appointments,
            meta: { total: appointments.length }
        });
    } catch (error) {
        console.error('Get appointments error:', error);
        return res.status(500).json({
            success: false,
            error: { code: 'INTERNAL_ERROR', message: 'An error occurred' }
        });
    }
}

async function handleGetDoctors(req: VercelRequest, res: VercelResponse) {
    const user = verifyToken(req);
    if (!user) {
        return res.status(401).json({
            success: false,
            error: { code: 'UNAUTHORIZED', message: 'Invalid or missing token' }
        });
    }

    try {
        const doctors = await prisma.doctor.findMany({
            where: {
                hospitalId: user.hospitalId,
                deletedAt: null
            },
            include: {
                user: true,
                department: true
            },
            take: 50
        });

        return res.status(200).json({
            success: true,
            data: doctors,
            meta: { total: doctors.length }
        });
    } catch (error) {
        console.error('Get doctors error:', error);
        return res.status(500).json({
            success: false,
            error: { code: 'INTERNAL_ERROR', message: 'An error occurred' }
        });
    }
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

export default async function handler(req: VercelRequest, res: VercelResponse) {
    // Handle CORS preflight
    setCorsHeaders(res);
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const { url, method } = req;
    const path = url?.replace(/\?.*$/, '') || '';

    // Route matching
    if (path === '/api/v1/health' && method === 'GET') {
        return handleHealth(res);
    }

    if (path === '/api/v1/auth/login' && method === 'POST') {
        return handleLogin(req, res);
    }

    if (path === '/api/v1/auth/me' && method === 'GET') {
        return handleGetMe(req, res);
    }

    if (path === '/api/v1/patients' && method === 'GET') {
        return handleGetPatients(req, res);
    }

    if (path === '/api/v1/appointments' && method === 'GET') {
        return handleGetAppointments(req, res);
    }

    if (path === '/api/v1/doctors' && method === 'GET') {
        return handleGetDoctors(req, res);
    }

    // 404 for unmatched API routes
    return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: `Endpoint ${method} ${path} not found` }
    });
}
