// ============================================================================
// HMS Backend - Authentication Middleware
// Verifies JWT and attaches user to request
// ============================================================================

import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, TokenPayload } from '../config/auth.js';

// Extend Express Request to include user
declare global {
    namespace Express {
        interface Request {
            user?: TokenPayload;
        }
    }
}

/**
 * Authentication middleware
 * Verifies JWT token from Authorization header
 * Attaches decoded user payload to request
 */
export const authenticate = (
    req: Request,
    res: Response,
    next: NextFunction
): void => {
    try {
        // Get token from Authorization header
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            res.status(401).json({
                success: false,
                error: {
                    code: 'UNAUTHORIZED',
                    message: 'Authentication required. Please provide a valid token.',
                },
            });
            return;
        }

        const token = authHeader.substring(7); // Remove 'Bearer ' prefix

        // Verify token
        const payload = verifyAccessToken(token);

        if (!payload) {
            res.status(401).json({
                success: false,
                error: {
                    code: 'INVALID_TOKEN',
                    message: 'Token is invalid or expired. Please login again.',
                },
            });
            return;
        }

        // Attach user to request
        req.user = payload;
        next();
    } catch (error) {
        res.status(401).json({
            success: false,
            error: {
                code: 'AUTH_ERROR',
                message: 'Authentication failed.',
            },
        });
    }
};

/**
 * Optional authentication middleware
 * Attaches user if token is valid, but doesn't require it
 */
export const optionalAuth = (
    req: Request,
    _res: Response,
    next: NextFunction
): void => {
    try {
        const authHeader = req.headers.authorization;

        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.substring(7);
            const payload = verifyAccessToken(token);
            if (payload) {
                req.user = payload;
            }
        }

        next();
    } catch {
        // Continue without user
        next();
    }
};
