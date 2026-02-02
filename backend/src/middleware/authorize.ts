// ============================================================================
// HMS Backend - Authorization Middleware
// Role-based and permission-based access control
// ============================================================================

import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database.js';

// Permission cache (simple in-memory, can be replaced with Redis)
const permissionCache = new Map<string, Set<string>>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const cacheTimestamps = new Map<string, number>();

/**
 * Check if user has specific role
 * @param allowedRoles - Array of role codes that are allowed
 */
export const requireRole = (...allowedRoles: string[]) => {
    return (req: Request, res: Response, next: NextFunction): void => {
        if (!req.user) {
            res.status(401).json({
                success: false,
                error: {
                    code: 'UNAUTHORIZED',
                    message: 'Authentication required.',
                },
            });
            return;
        }

        if (!allowedRoles.includes(req.user.roleCode)) {
            res.status(403).json({
                success: false,
                error: {
                    code: 'FORBIDDEN',
                    message: 'You do not have permission to access this resource.',
                },
            });
            return;
        }

        next();
    };
};

/**
 * Check if user has specific permission
 * @param module - Module name (e.g., 'patients', 'appointments')
 * @param action - Action name (e.g., 'create', 'read', 'update', 'delete')
 */
export const requirePermission = (module: string, action: string) => {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        if (!req.user) {
            res.status(401).json({
                success: false,
                error: {
                    code: 'UNAUTHORIZED',
                    message: 'Authentication required.',
                },
            });
            return;
        }

        try {
            // Check cache first
            const cacheKey = req.user.userId;
            const now = Date.now();

            let userPermissions = permissionCache.get(cacheKey);
            const cacheTime = cacheTimestamps.get(cacheKey);

            // Refresh cache if expired
            if (!userPermissions || !cacheTime || now - cacheTime > CACHE_TTL) {
                userPermissions = await loadUserPermissions(req.user.userId);
                permissionCache.set(cacheKey, userPermissions);
                cacheTimestamps.set(cacheKey, now);
            }

            const requiredPermission = `${module}:${action}`;

            if (!userPermissions.has(requiredPermission)) {
                res.status(403).json({
                    success: false,
                    error: {
                        code: 'FORBIDDEN',
                        message: `Permission denied. Required: ${requiredPermission}`,
                    },
                });
                return;
            }

            next();
        } catch (error) {
            res.status(500).json({
                success: false,
                error: {
                    code: 'PERMISSION_CHECK_ERROR',
                    message: 'Failed to verify permissions.',
                },
            });
        }
    };
};

/**
 * Load user permissions from database
 */
async function loadUserPermissions(userId: string): Promise<Set<string>> {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
            role: {
                include: {
                    permissions: {
                        include: {
                            permission: true,
                        },
                    },
                },
            },
        },
    });

    if (!user) {
        return new Set();
    }

    const permissions = new Set<string>();

    // Add all permissions from user's role
    for (const rolePermission of user.role.permissions) {
        const perm = rolePermission.permission;
        permissions.add(`${perm.module}:${perm.action}`);
    }

    return permissions;
}

/**
 * Clear permission cache for a user
 * Call this after role or permission changes
 */
export const clearPermissionCache = (userId?: string): void => {
    if (userId) {
        permissionCache.delete(userId);
        cacheTimestamps.delete(userId);
    } else {
        permissionCache.clear();
        cacheTimestamps.clear();
    }
};

/**
 * Require user to belong to specific hospital
 * For multi-tenancy enforcement
 */
export const requireHospital = (
    req: Request,
    res: Response,
    next: NextFunction
): void => {
    if (!req.user) {
        res.status(401).json({
            success: false,
            error: {
                code: 'UNAUTHORIZED',
                message: 'Authentication required.',
            },
        });
        return;
    }

    // Get hospitalId from params or body
    const requestedHospitalId =
        req.params.hospitalId || req.body?.hospitalId || req.query.hospitalId;

    // Super admins can access any hospital
    if (req.user.roleCode === 'SUPER_ADMIN') {
        next();
        return;
    }

    // Check if user belongs to requested hospital
    if (requestedHospitalId && requestedHospitalId !== req.user.hospitalId) {
        res.status(403).json({
            success: false,
            error: {
                code: 'FORBIDDEN',
                message: 'You can only access data from your hospital.',
            },
        });
        return;
    }

    next();
};
