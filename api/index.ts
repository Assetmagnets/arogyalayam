// ============================================================================
// HMS Backend - Vercel Serverless API Handler
// Catch-all route that wraps Express app for Vercel
// ============================================================================

import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
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
// EXPRESS APP
// ============================================================================

const app: Express = express();

// CORS - Allow all origins for now
app.use(cors({
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));

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
// MIDDLEWARE
// ============================================================================

interface JWTPayload {
    userId: string;
    email: string;
    hospitalId: string;
}

const authenticate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader?.startsWith('Bearer ')) {
            res.status(401).json({
                success: false,
                error: { code: 'UNAUTHORIZED', message: 'No token provided' }
            });
            return;
        }

        const token = authHeader.substring(7);
        const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;

        (req as any).user = decoded;
        next();
    } catch {
        res.status(401).json({
            success: false,
            error: { code: 'UNAUTHORIZED', message: 'Invalid token' }
        });
    }
};

// ============================================================================
// ROUTES
// ============================================================================

// Health check
app.get('/api/v1/health', async (_req: Request, res: Response) => {
    try {
        await prisma.$queryRaw`SELECT 1`;
        res.json({
            success: true,
            data: {
                status: 'healthy',
                database: 'connected',
                timestamp: new Date().toISOString(),
            },
        });
    } catch {
        res.status(503).json({
            success: false,
            data: {
                status: 'unhealthy',
                database: 'disconnected',
                timestamp: new Date().toISOString(),
            },
        });
    }
});

// Login
app.post('/api/v1/auth/login', async (req: Request, res: Response) => {
    try {
        const validation = LoginSchema.safeParse(req.body);
        if (!validation.success) {
            res.status(400).json({
                success: false,
                error: {
                    code: 'VALIDATION_ERROR',
                    message: 'Invalid request data',
                    details: validation.error.flatten(),
                },
            });
            return;
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
            res.status(401).json({
                success: false,
                error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' }
            });
            return;
        }

        // Check password
        const isValid = await bcrypt.compare(password, user.passwordHash);
        if (!isValid) {
            res.status(401).json({
                success: false,
                error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' }
            });
            return;
        }

        // Check status
        if (user.status !== 'ACTIVE') {
            res.status(403).json({
                success: false,
                error: { code: 'ACCOUNT_INACTIVE', message: 'Account is not active' }
            });
            return;
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
        const permissions = user.role.permissions.map(rp => rp.permission.name);

        res.json({
            success: true,
            data: {
                accessToken: token,
                refreshToken: token, // Simplified - use same token
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
        res.status(500).json({
            success: false,
            error: { code: 'INTERNAL_ERROR', message: 'An error occurred' }
        });
    }
});

// Get current user
app.get('/api/v1/auth/me', authenticate, async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.userId;
        const user = await prisma.user.findUnique({
            where: { id: userId },
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
            res.status(404).json({
                success: false,
                error: { code: 'USER_NOT_FOUND', message: 'User not found' }
            });
            return;
        }

        const permissions = user.role.permissions.map(rp => rp.permission.name);

        res.json({
            success: true,
            data: {
                id: user.id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                hospitalId: user.hospitalId,
                role: user.role.name,
                permissions,
                status: user.status,
                lastLoginAt: user.lastLoginAt,
            },
        });
    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({
            success: false,
            error: { code: 'INTERNAL_ERROR', message: 'An error occurred' }
        });
    }
});

// Patients list (simplified)
app.get('/api/v1/patients', authenticate, async (req: Request, res: Response) => {
    try {
        const hospitalId = (req as any).user.hospitalId;
        const patients = await prisma.patient.findMany({
            where: {
                hospitalId,
                deletedAt: null
            },
            take: 50,
            orderBy: { createdAt: 'desc' }
        });

        res.json({
            success: true,
            data: patients,
            meta: { total: patients.length }
        });
    } catch (error) {
        console.error('Get patients error:', error);
        res.status(500).json({
            success: false,
            error: { code: 'INTERNAL_ERROR', message: 'An error occurred' }
        });
    }
});

// Appointments list (simplified)
app.get('/api/v1/appointments', authenticate, async (req: Request, res: Response) => {
    try {
        const hospitalId = (req as any).user.hospitalId;
        const appointments = await prisma.appointment.findMany({
            where: {
                hospitalId,
                deletedAt: null
            },
            include: {
                patient: true,
                doctor: { include: { user: true } }
            },
            take: 50,
            orderBy: { appointmentDate: 'desc' }
        });

        res.json({
            success: true,
            data: appointments,
            meta: { total: appointments.length }
        });
    } catch (error) {
        console.error('Get appointments error:', error);
        res.status(500).json({
            success: false,
            error: { code: 'INTERNAL_ERROR', message: 'An error occurred' }
        });
    }
});

// Doctors list (simplified)
app.get('/api/v1/doctors', authenticate, async (req: Request, res: Response) => {
    try {
        const hospitalId = (req as any).user.hospitalId;
        const doctors = await prisma.doctor.findMany({
            where: {
                hospitalId,
                deletedAt: null
            },
            include: {
                user: true,
                department: true
            },
            take: 50
        });

        res.json({
            success: true,
            data: doctors,
            meta: { total: doctors.length }
        });
    } catch (error) {
        console.error('Get doctors error:', error);
        res.status(500).json({
            success: false,
            error: { code: 'INTERNAL_ERROR', message: 'An error occurred' }
        });
    }
});

// 404 handler
app.use((_req: Request, res: Response) => {
    res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Endpoint not found' }
    });
});

// Error handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    console.error('Unhandled error:', err);
    res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' }
    });
});

export default app;
