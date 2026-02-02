// ============================================================================
// HMS Backend - Authentication Routes
// Login, register, token refresh, logout, password change
// ============================================================================

import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../config/index.js';
import { authenticate, validate } from '../middleware/index.js';
import { createAuthService } from '../services/AuthService.js';

const router = Router();
const authService = createAuthService(prisma);

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const LoginSchema = z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(1, 'Password is required'),
});

const RegisterSchema = z.object({
    email: z.string().email('Invalid email address'),
    password: z
        .string()
        .min(8, 'Password must be at least 8 characters')
        .regex(
            /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]+$/,
            'Password must contain uppercase, lowercase, number, and special character'
        ),
    firstName: z.string().min(1, 'First name is required').max(100),
    lastName: z.string().min(1, 'Last name is required').max(100),
    phone: z.string().optional(),
    hospitalId: z.string().cuid('Invalid hospital ID'),
    roleId: z.string().cuid('Invalid role ID'),
});

const RefreshTokenSchema = z.object({
    refreshToken: z.string().min(1, 'Refresh token is required'),
});

const ChangePasswordSchema = z.object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z
        .string()
        .min(8, 'Password must be at least 8 characters')
        .regex(
            /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]+$/,
            'Password must contain uppercase, lowercase, number, and special character'
        ),
});

// ============================================================================
// ROUTES
// ============================================================================

/**
 * POST /api/v1/auth/login
 * Authenticate user and return tokens
 */
router.post(
    '/login',
    validate({ body: LoginSchema }),
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { email, password } = req.body;
            const result = await authService.login(email, password);

            res.json({
                success: true,
                data: result,
            });
        } catch (error) {
            next(error);
        }
    }
);

/**
 * POST /api/v1/auth/register
 * Register a new user (admin only in production)
 */
router.post(
    '/register',
    validate({ body: RegisterSchema }),
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            // In production, this should require admin authentication
            const createdBy = req.user?.userId || 'system';
            const result = await authService.register(req.body, createdBy);

            res.status(201).json({
                success: true,
                data: {
                    message: result.message,
                    userId: result.user.id,
                },
            });
        } catch (error) {
            next(error);
        }
    }
);

/**
 * POST /api/v1/auth/refresh
 * Refresh access token using refresh token
 */
router.post(
    '/refresh',
    validate({ body: RefreshTokenSchema }),
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { refreshToken } = req.body;
            const tokens = await authService.refreshToken(refreshToken);

            res.json({
                success: true,
                data: tokens,
            });
        } catch (error) {
            next(error);
        }
    }
);

/**
 * POST /api/v1/auth/logout
 * Invalidate refresh token
 */
router.post(
    '/logout',
    authenticate,
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            await authService.logout(req.user!.userId);

            res.json({
                success: true,
                data: { message: 'Logged out successfully' },
            });
        } catch (error) {
            next(error);
        }
    }
);

/**
 * POST /api/v1/auth/change-password
 * Change user password
 */
router.post(
    '/change-password',
    authenticate,
    validate({ body: ChangePasswordSchema }),
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { currentPassword, newPassword } = req.body;
            await authService.changePassword(req.user!.userId, currentPassword, newPassword);

            res.json({
                success: true,
                data: { message: 'Password changed successfully. Please login again.' },
            });
        } catch (error) {
            next(error);
        }
    }
);

/**
 * GET /api/v1/auth/me
 * Get current user profile
 */
router.get(
    '/me',
    authenticate,
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const user = await authService.getUserById(req.user!.userId);

            if (!user) {
                res.status(404).json({
                    success: false,
                    error: { code: 'USER_NOT_FOUND', message: 'User not found' },
                });
                return;
            }

            res.json({
                success: true,
                data: {
                    id: user.id,
                    email: user.email,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    phone: user.phone,
                    hospitalId: user.hospitalId,
                    status: user.status,
                    lastLoginAt: user.lastLoginAt,
                },
            });
        } catch (error) {
            next(error);
        }
    }
);

export default router;
