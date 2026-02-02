// ============================================================================
// HMS Backend - User Routes
// CRUD operations for user management
// ============================================================================

import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { prisma } from '../config/index.js';
import {
    authenticate,
    requirePermission,
    validate,
    PaginationQuerySchema,
    IdParamSchema,
} from '../middleware/index.js';

const router = Router();

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const UserSearchQuerySchema = PaginationQuerySchema.extend({
    roleCode: z.string().optional(),
    status: z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED', 'PENDING_VERIFICATION']).optional(),
});

const CreateUserSchema = z.object({
    email: z.string().email('Invalid email format'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    firstName: z.string().min(1, 'First name is required'),
    lastName: z.string().min(1, 'Last name is required'),
    roleCode: z.string().min(1, 'Role is required'),
    phone: z.string().regex(/^[6-9]\d{9}$/, 'Invalid mobile number').optional(),
});

const UpdateUserSchema = z.object({
    email: z.string().email('Invalid email format').optional(),
    password: z.string().min(8, 'Password must be at least 8 characters').optional(),
    firstName: z.string().min(1).optional(),
    lastName: z.string().min(1).optional(),
    roleCode: z.string().optional(),
    phone: z.string().regex(/^[6-9]\d{9}$/, 'Invalid mobile number').optional(),
    status: z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED']).optional(),
});

// ============================================================================
// ROUTES
// ============================================================================

/**
 * GET /api/v1/users
 * List all users with pagination
 */
router.get(
    '/',
    authenticate,
    requirePermission('users', 'read'),
    validate({ query: UserSearchQuerySchema }),
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { page, limit, search, roleCode, status } = req.query as unknown as z.infer<typeof UserSearchQuerySchema>;
            const hospitalId = req.user!.hospitalId;

            // Build where clause
            const where: Record<string, unknown> = {
                hospitalId,
                deletedAt: null,
            };

            if (roleCode) {
                where.role = { code: roleCode };
            }

            if (status) {
                where.status = status;
            }

            if (search) {
                where.OR = [
                    { firstName: { contains: search, mode: 'insensitive' } },
                    { lastName: { contains: search, mode: 'insensitive' } },
                    { email: { contains: search, mode: 'insensitive' } },
                ];
            }

            const [users, total] = await Promise.all([
                prisma.user.findMany({
                    where,
                    include: {
                        role: { select: { id: true, name: true, code: true } },
                    },
                    orderBy: { createdAt: 'desc' },
                    skip: (page - 1) * limit,
                    take: limit,
                }),
                prisma.user.count({ where }),
            ]);

            res.json({
                success: true,
                data: users.map((u) => ({
                    id: u.id,
                    email: u.email,
                    firstName: u.firstName,
                    lastName: u.lastName,
                    phone: u.phone,
                    status: u.status,
                    role: u.role,
                    lastLoginAt: u.lastLoginAt,
                    createdAt: u.createdAt,
                })),
                meta: {
                    page,
                    limit,
                    total,
                    totalPages: Math.ceil(total / limit),
                },
            });
        } catch (error) {
            next(error);
        }
    }
);

/**
 * GET /api/v1/users/roles
 * Get all available roles
 */
router.get(
    '/roles',
    authenticate,
    async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const roles = await prisma.role.findMany({
                where: { deletedAt: null },
                select: { id: true, name: true, code: true, description: true },
                orderBy: { name: 'asc' },
            });

            res.json({
                success: true,
                data: roles,
            });
        } catch (error) {
            next(error);
        }
    }
);

/**
 * GET /api/v1/users/:id
 * Get user by ID
 */
router.get(
    '/:id',
    authenticate,
    requirePermission('users', 'read'),
    validate({ params: IdParamSchema }),
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { id } = req.params;
            const hospitalId = req.user!.hospitalId;

            const user = await prisma.user.findFirst({
                where: {
                    id,
                    hospitalId,
                    deletedAt: null,
                },
                include: {
                    role: { select: { id: true, name: true, code: true } },
                },
            });

            if (!user) {
                res.status(404).json({
                    success: false,
                    error: { code: 'NOT_FOUND', message: 'User not found' },
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
                    status: user.status,
                    role: user.role,
                    lastLoginAt: user.lastLoginAt,
                    createdAt: user.createdAt,
                    updatedAt: user.updatedAt,
                },
            });
        } catch (error) {
            next(error);
        }
    }
);

/**
 * POST /api/v1/users
 * Create a new user
 */
router.post(
    '/',
    authenticate,
    requirePermission('users', 'create'),
    validate({ body: CreateUserSchema }),
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const hospitalId = req.user!.hospitalId;
            const createdBy = req.user!.userId;
            const { email, password, firstName, lastName, roleCode, phone } = req.body;

            // Check if email already exists
            const existingUser = await prisma.user.findFirst({
                where: { email, deletedAt: null },
            });

            if (existingUser) {
                res.status(409).json({
                    success: false,
                    error: { code: 'DUPLICATE', message: 'Email already exists' },
                });
                return;
            }

            // Get role by code
            const role = await prisma.role.findFirst({
                where: { code: roleCode, deletedAt: null },
            });

            if (!role) {
                res.status(400).json({
                    success: false,
                    error: { code: 'INVALID_ROLE', message: 'Invalid role code' },
                });
                return;
            }

            // Hash password
            const hashedPassword = await bcrypt.hash(password, 12);

            const user = await prisma.user.create({
                data: {
                    email,
                    passwordHash: hashedPassword,
                    firstName,
                    lastName,
                    phone,
                    hospitalId,
                    roleId: role.id,
                    status: 'ACTIVE',
                    createdBy,
                    updatedBy: createdBy,
                },
                include: {
                    role: { select: { id: true, name: true, code: true } },
                },
            });

            res.status(201).json({
                success: true,
                data: {
                    id: user.id,
                    email: user.email,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    role: user.role,
                    message: 'User created successfully',
                },
            });
        } catch (error) {
            next(error);
        }
    }
);

/**
 * PUT /api/v1/users/:id
 * Update user
 */
router.put(
    '/:id',
    authenticate,
    requirePermission('users', 'update'),
    validate({ params: IdParamSchema, body: UpdateUserSchema }),
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { id } = req.params;
            const hospitalId = req.user!.hospitalId;
            const updatedBy = req.user!.userId;
            const { email, password, firstName, lastName, roleCode, phone, status } = req.body;

            // Check if user exists
            const existingUser = await prisma.user.findFirst({
                where: { id, hospitalId, deletedAt: null },
            });

            if (!existingUser) {
                res.status(404).json({
                    success: false,
                    error: { code: 'NOT_FOUND', message: 'User not found' },
                });
                return;
            }

            // Build update data
            const updateData: Record<string, unknown> = { updatedBy };

            if (email && email !== existingUser.email) {
                // Check email uniqueness
                const emailExists = await prisma.user.findFirst({
                    where: { email, id: { not: id }, deletedAt: null },
                });
                if (emailExists) {
                    res.status(409).json({
                        success: false,
                        error: { code: 'DUPLICATE', message: 'Email already exists' },
                    });
                    return;
                }
                updateData.email = email;
            }

            if (password) {
                updateData.passwordHash = await bcrypt.hash(password, 12);
            }

            if (firstName) updateData.firstName = firstName;
            if (lastName) updateData.lastName = lastName;
            if (phone !== undefined) updateData.phone = phone;
            if (status) updateData.status = status;

            if (roleCode) {
                const role = await prisma.role.findFirst({
                    where: { code: roleCode, deletedAt: null },
                });
                if (role) {
                    updateData.roleId = role.id;
                }
            }

            const user = await prisma.user.update({
                where: { id },
                data: updateData,
                include: {
                    role: { select: { id: true, name: true, code: true } },
                },
            });

            res.json({
                success: true,
                data: {
                    id: user.id,
                    email: user.email,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    role: user.role,
                    message: 'User updated successfully',
                },
            });
        } catch (error) {
            next(error);
        }
    }
);

/**
 * DELETE /api/v1/users/:id
 * Soft delete user (deactivate)
 */
router.delete(
    '/:id',
    authenticate,
    requirePermission('users', 'delete'),
    validate({ params: IdParamSchema }),
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { id } = req.params;
            const hospitalId = req.user!.hospitalId;
            const userId = req.user!.userId;

            // Prevent self-deletion
            if (id === userId) {
                res.status(400).json({
                    success: false,
                    error: { code: 'FORBIDDEN', message: 'Cannot delete your own account' },
                });
                return;
            }

            const user = await prisma.user.findFirst({
                where: { id, hospitalId, deletedAt: null },
            });

            if (!user) {
                res.status(404).json({
                    success: false,
                    error: { code: 'NOT_FOUND', message: 'User not found' },
                });
                return;
            }

            await prisma.user.update({
                where: { id },
                data: {
                    deletedAt: new Date(),
                    updatedBy: userId,
                    status: 'INACTIVE',
                },
            });

            res.json({
                success: true,
                data: { message: 'User deleted successfully' },
            });
        } catch (error) {
            next(error);
        }
    }
);

// ============================================================================
// PERMISSION MANAGEMENT
// ============================================================================

/**
 * GET /api/v1/users/permissions/all
 * Get all available permissions grouped by module
 */
router.get(
    '/permissions/all',
    authenticate,
    requirePermission('users', 'read'),
    async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const permissions = await prisma.permission.findMany({
                orderBy: [{ module: 'asc' }, { action: 'asc' }],
            });

            // Group permissions by module
            const grouped = permissions.reduce((acc, perm) => {
                if (!acc[perm.module]) {
                    acc[perm.module] = [];
                }
                acc[perm.module].push({
                    id: perm.id,
                    action: perm.action,
                    description: perm.description,
                });
                return acc;
            }, {} as Record<string, Array<{ id: string; action: string; description: string | null }>>);

            res.json({
                success: true,
                data: {
                    permissions: grouped,
                    modules: Object.keys(grouped),
                },
            });
        } catch (error) {
            next(error);
        }
    }
);

/**
 * GET /api/v1/users/:id/permissions
 * Get user's permissions from their role
 */
router.get(
    '/:id/permissions',
    authenticate,
    requirePermission('users', 'read'),
    validate({ params: IdParamSchema }),
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { id } = req.params;
            const hospitalId = req.user!.hospitalId;

            const user = await prisma.user.findFirst({
                where: { id, hospitalId, deletedAt: null },
                include: {
                    role: {
                        include: {
                            permissions: {
                                include: { permission: true },
                            },
                        },
                    },
                },
            });

            if (!user) {
                res.status(404).json({
                    success: false,
                    error: { code: 'NOT_FOUND', message: 'User not found' },
                });
                return;
            }

            // Collect role permissions
            const rolePermissions = user.role.permissions.map((rp: { permission: { id: string; module: string; action: string } }) => ({
                id: rp.permission.id,
                module: rp.permission.module,
                action: rp.permission.action,
            }));

            res.json({
                success: true,
                data: {
                    roleName: user.role.name,
                    roleCode: user.role.code,
                    permissions: rolePermissions,
                    permissionIds: rolePermissions.map((p: { id: string }) => p.id),
                },
            });
        } catch (error) {
            next(error);
        }
    }
);

/**
 * GET /api/v1/users/roles/:roleCode/permissions
 * Get permissions for a specific role
 */
router.get(
    '/roles/:roleCode/permissions',
    authenticate,
    requirePermission('users', 'read'),
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { roleCode } = req.params;

            const role = await prisma.role.findFirst({
                where: { code: roleCode, deletedAt: null },
                include: {
                    permissions: {
                        include: { permission: true },
                    },
                },
            });

            if (!role) {
                res.status(404).json({
                    success: false,
                    error: { code: 'NOT_FOUND', message: 'Role not found' },
                });
                return;
            }

            const permissions = role.permissions.map((rp: { permission: { id: string; module: string; action: string } }) => ({
                id: rp.permission.id,
                module: rp.permission.module,
                action: rp.permission.action,
            }));

            res.json({
                success: true,
                data: {
                    roleName: role.name,
                    roleCode: role.code,
                    permissions,
                    permissionIds: permissions.map((p: { id: string }) => p.id),
                },
            });
        } catch (error) {
            next(error);
        }
    }
);

/**
 * PUT /api/v1/users/roles/:roleCode/permissions
 * Update permissions for a role
 */
router.put(
    '/roles/:roleCode/permissions',
    authenticate,
    requirePermission('users', 'update'),
    validate({
        body: z.object({
            permissionIds: z.array(z.string().cuid()),
        }),
    }),
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { roleCode } = req.params;
            const { permissionIds } = req.body;

            // Check role exists and is not a system role
            const role = await prisma.role.findFirst({
                where: { code: roleCode, deletedAt: null },
            });

            if (!role) {
                res.status(404).json({
                    success: false,
                    error: { code: 'NOT_FOUND', message: 'Role not found' },
                });
                return;
            }

            if (role.isSystemRole && roleCode === 'SUPER_ADMIN') {
                res.status(403).json({
                    success: false,
                    error: { code: 'FORBIDDEN', message: 'Cannot modify Super Admin permissions' },
                });
                return;
            }

            // Delete existing role permissions
            await prisma.rolePermission.deleteMany({
                where: { roleId: role.id },
            });

            // Create new role permissions
            if (permissionIds.length > 0) {
                await prisma.rolePermission.createMany({
                    data: permissionIds.map((permissionId: string) => ({
                        roleId: role.id,
                        permissionId,
                    })),
                });
            }

            res.json({
                success: true,
                data: {
                    message: 'Role permissions updated successfully',
                    permissionCount: permissionIds.length,
                },
            });
        } catch (error) {
            next(error);
        }
    }
);

export default router;


