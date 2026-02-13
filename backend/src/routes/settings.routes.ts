// ============================================================================
// HMS Backend - Settings Routes
// Hospital settings, departments, roles, and permissions management
// ============================================================================

import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../config/index.js';
import { authenticate, requirePermission, validate, IdParamSchema } from '../middleware/index.js';

const router = Router();

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const UpdateHospitalSchema = z.object({
    name: z.string().min(1).optional(),
    registrationNo: z.string().optional().nullable(),
    licenseNo: z.string().optional().nullable(),
    email: z.string().email().optional().nullable(),
    phone: z.string().optional().nullable(),
    website: z.string().url().optional().nullable(),
    addressLine1: z.string().optional().nullable(),
    addressLine2: z.string().optional().nullable(),
    city: z.string().optional().nullable(),
    district: z.string().optional().nullable(),
    state: z.string().optional().nullable(),
    pinCode: z.string().regex(/^\d{6}$/, 'Invalid PIN code').optional().nullable(),
    gstNumber: z.string().optional().nullable(),
    panNumber: z.string().optional().nullable(),
    logoUrl: z.string().url().optional().nullable(),
    primaryColor: z.string().optional().nullable(),
    timezone: z.string().optional(),
    currency: z.string().optional(),
});

const CreateDepartmentSchema = z.object({
    name: z.string().min(1, 'Department name is required'),
    code: z.string().min(1, 'Department code is required').max(10).toUpperCase(),
    description: z.string().optional(),
    displayOrder: z.number().int().min(0).optional(),
});

const UpdateDepartmentSchema = z.object({
    name: z.string().min(1).optional(),
    code: z.string().min(1).max(10).toUpperCase().optional(),
    description: z.string().optional().nullable(),
    displayOrder: z.number().int().min(0).optional(),
    isActive: z.boolean().optional(),
});

// ============================================================================
// HOSPITAL SETTINGS ROUTES
// ============================================================================

/**
 * GET /api/v1/settings/hospital
 * Get current hospital settings
 */
router.get(
    '/hospital',
    authenticate,
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const hospitalId = req.user!.hospitalId;

            const hospital = await prisma.hospital.findUnique({
                where: { id: hospitalId },
                select: {
                    id: true,
                    name: true,
                    code: true,
                    registrationNo: true,
                    licenseNo: true,
                    email: true,
                    phone: true,
                    website: true,
                    addressLine1: true,
                    addressLine2: true,
                    city: true,
                    district: true,
                    state: true,
                    pinCode: true,
                    country: true,
                    timezone: true,
                    currency: true,
                    gstNumber: true,
                    panNumber: true,
                    logoUrl: true,
                    primaryColor: true,
                    createdAt: true,
                    updatedAt: true,
                },
            });

            if (!hospital) {
                res.status(404).json({
                    success: false,
                    error: { code: 'HOSPITAL_NOT_FOUND', message: 'Hospital not found' },
                });
                return;
            }

            res.json({
                success: true,
                data: hospital,
            });
        } catch (error) {
            next(error);
        }
    }
);

/**
 * PUT /api/v1/settings/hospital
 * Update hospital settings
 */
router.put(
    '/hospital',
    authenticate,
    requirePermission('settings', 'update'),
    validate({ body: UpdateHospitalSchema }),
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const hospitalId = req.user!.hospitalId;
            const updatedBy = req.user!.userId;
            const updateData = req.body;

            const hospital = await prisma.hospital.update({
                where: { id: hospitalId },
                data: {
                    ...updateData,
                    updatedBy,
                },
                select: {
                    id: true,
                    name: true,
                    code: true,
                    registrationNo: true,
                    licenseNo: true,
                    email: true,
                    phone: true,
                    website: true,
                    addressLine1: true,
                    addressLine2: true,
                    city: true,
                    district: true,
                    state: true,
                    pinCode: true,
                    country: true,
                    timezone: true,
                    currency: true,
                    gstNumber: true,
                    panNumber: true,
                    logoUrl: true,
                    primaryColor: true,
                    updatedAt: true,
                },
            });

            res.json({
                success: true,
                data: hospital,
                message: 'Hospital settings updated successfully',
            });
        } catch (error) {
            next(error);
        }
    }
);

// ============================================================================
// MODULE VISIBILITY ROUTES
// ============================================================================

// Available modules configuration
const AVAILABLE_MODULES = [
    { code: 'dashboard', name: 'Dashboard', description: 'Main dashboard overview', icon: 'LayoutDashboard', alwaysEnabled: true },
    { code: 'patients', name: 'Patients', description: 'Patient registration & management', icon: 'Users' },
    { code: 'appointments', name: 'Appointments', description: 'Appointment scheduling', icon: 'Calendar' },
    { code: 'opd', name: 'OPD', description: 'Outpatient department & queue', icon: 'Stethoscope' },
    { code: 'ipd', name: 'IPD', description: 'Inpatient department & admissions', icon: 'BedDouble' },
    { code: 'emr', name: 'EMR', description: 'Electronic Medical Records', icon: 'FileText' },
    { code: 'pharmacy', name: 'Pharmacy', description: 'Pharmacy & dispensing', icon: 'Pill' },
    { code: 'lab', name: 'Laboratory', description: 'Lab tests & results', icon: 'TestTube2' },
    { code: 'billing', name: 'Billing', description: 'Invoicing & payments', icon: 'Receipt' },
    { code: 'reports', name: 'Reports', description: 'Reports & analytics', icon: 'BarChart3' },
    { code: 'users', name: 'Users', description: 'User management', icon: 'UserCog' },
    { code: 'settings', name: 'Settings', description: 'System settings', icon: 'Settings', alwaysEnabled: true },
];

const UpdateModulesSchema = z.object({
    enabledModules: z.array(z.string()).min(1, 'At least one module must be enabled'),
});

/**
 * GET /api/v1/settings/modules
 * Get available modules and their enabled status
 */
router.get(
    '/modules',
    authenticate,
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const hospitalId = req.user!.hospitalId;

            const hospital = await prisma.hospital.findUnique({
                where: { id: hospitalId },
                select: { enabledModules: true },
            });

            if (!hospital) {
                res.status(404).json({
                    success: false,
                    error: { code: 'HOSPITAL_NOT_FOUND', message: 'Hospital not found' },
                });
                return;
            }

            const enabledSet = new Set(hospital.enabledModules);

            res.json({
                success: true,
                data: {
                    availableModules: AVAILABLE_MODULES,
                    enabledModules: hospital.enabledModules,
                    modules: AVAILABLE_MODULES.map((m) => ({
                        ...m,
                        isEnabled: m.alwaysEnabled || enabledSet.has(m.code),
                    })),
                },
            });
        } catch (error) {
            next(error);
        }
    }
);

/**
 * PUT /api/v1/settings/modules
 * Update enabled modules for the hospital
 */
router.put(
    '/modules',
    authenticate,
    requirePermission('settings', 'update'),
    validate({ body: UpdateModulesSchema }),
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const hospitalId = req.user!.hospitalId;
            const updatedBy = req.user!.userId;
            let { enabledModules } = req.body;

            // Ensure dashboard is always included
            if (!enabledModules.includes('dashboard')) {
                enabledModules = ['dashboard', ...enabledModules];
            }

            // Validate that all provided modules are valid
            const validCodes = new Set(AVAILABLE_MODULES.map((m) => m.code));
            const invalidModules = enabledModules.filter((m: string) => !validCodes.has(m));

            if (invalidModules.length > 0) {
                res.status(400).json({
                    success: false,
                    error: {
                        code: 'INVALID_MODULES',
                        message: `Invalid module codes: ${invalidModules.join(', ')}`,
                    },
                });
                return;
            }

            const hospital = await prisma.hospital.update({
                where: { id: hospitalId },
                data: {
                    enabledModules,
                    updatedBy,
                },
                select: { enabledModules: true },
            });

            res.json({
                success: true,
                data: { enabledModules: hospital.enabledModules },
                message: 'Module settings updated successfully',
            });
        } catch (error) {
            next(error);
        }
    }
);

// ============================================================================
// DEPARTMENT MANAGEMENT ROUTES
// ============================================================================

/**
 * GET /api/v1/settings/departments
 * List all departments for the hospital
 */
router.get(
    '/departments',
    authenticate,
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const hospitalId = req.user!.hospitalId;
            const { includeInactive } = req.query;

            const where: { hospitalId: string; deletedAt: null; isActive?: boolean } = {
                hospitalId,
                deletedAt: null,
            };

            // Only filter by isActive if not explicitly requesting inactive ones
            if (includeInactive !== 'true') {
                where.isActive = true;
            }

            const departments = await prisma.department.findMany({
                where,
                orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }],
                include: {
                    _count: {
                        select: { doctors: true },
                    },
                },
            });

            res.json({
                success: true,
                data: departments.map((dept) => ({
                    id: dept.id,
                    name: dept.name,
                    code: dept.code,
                    description: dept.description,
                    displayOrder: dept.displayOrder,
                    isActive: dept.isActive,
                    doctorCount: dept._count.doctors,
                    createdAt: dept.createdAt,
                    updatedAt: dept.updatedAt,
                })),
            });
        } catch (error) {
            next(error);
        }
    }
);

/**
 * GET /api/v1/settings/departments/:id
 * Get single department by ID
 */
router.get(
    '/departments/:id',
    authenticate,
    validate({ params: IdParamSchema }),
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { id } = req.params;
            const hospitalId = req.user!.hospitalId;

            const department = await prisma.department.findFirst({
                where: {
                    id,
                    hospitalId,
                    deletedAt: null,
                },
                include: {
                    _count: {
                        select: { doctors: true },
                    },
                },
            });

            if (!department) {
                res.status(404).json({
                    success: false,
                    error: { code: 'DEPARTMENT_NOT_FOUND', message: 'Department not found' },
                });
                return;
            }

            res.json({
                success: true,
                data: {
                    id: department.id,
                    name: department.name,
                    code: department.code,
                    description: department.description,
                    displayOrder: department.displayOrder,
                    isActive: department.isActive,
                    doctorCount: department._count.doctors,
                    createdAt: department.createdAt,
                    updatedAt: department.updatedAt,
                },
            });
        } catch (error) {
            next(error);
        }
    }
);

/**
 * POST /api/v1/settings/departments
 * Create a new department
 */
router.post(
    '/departments',
    authenticate,
    requirePermission('settings', 'create'),
    validate({ body: CreateDepartmentSchema }),
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const hospitalId = req.user!.hospitalId;
            const createdBy = req.user!.userId;
            const { name, code, description, displayOrder } = req.body;

            // Check if code already exists for this hospital
            const existing = await prisma.department.findFirst({
                where: {
                    hospitalId,
                    code: code.toUpperCase(),
                    deletedAt: null,
                },
            });

            if (existing) {
                res.status(409).json({
                    success: false,
                    error: { code: 'DEPARTMENT_CODE_EXISTS', message: 'Department code already exists' },
                });
                return;
            }

            const department = await prisma.department.create({
                data: {
                    hospitalId,
                    name,
                    code: code.toUpperCase(),
                    description,
                    displayOrder: displayOrder ?? 0,
                    createdBy,
                    updatedBy: createdBy,
                },
            });

            res.status(201).json({
                success: true,
                data: {
                    id: department.id,
                    name: department.name,
                    code: department.code,
                    description: department.description,
                    displayOrder: department.displayOrder,
                    isActive: department.isActive,
                },
                message: 'Department created successfully',
            });
        } catch (error) {
            next(error);
        }
    }
);

/**
 * PUT /api/v1/settings/departments/:id
 * Update a department
 */
router.put(
    '/departments/:id',
    authenticate,
    requirePermission('settings', 'update'),
    validate({ params: IdParamSchema, body: UpdateDepartmentSchema }),
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { id } = req.params;
            const hospitalId = req.user!.hospitalId;
            const updatedBy = req.user!.userId;
            const updateData = req.body;

            // Verify department exists and belongs to hospital
            const existing = await prisma.department.findFirst({
                where: {
                    id,
                    hospitalId,
                    deletedAt: null,
                },
            });

            if (!existing) {
                res.status(404).json({
                    success: false,
                    error: { code: 'DEPARTMENT_NOT_FOUND', message: 'Department not found' },
                });
                return;
            }

            // If updating code, check uniqueness
            if (updateData.code && updateData.code !== existing.code) {
                const codeExists = await prisma.department.findFirst({
                    where: {
                        hospitalId,
                        code: updateData.code.toUpperCase(),
                        deletedAt: null,
                        id: { not: id },
                    },
                });

                if (codeExists) {
                    res.status(409).json({
                        success: false,
                        error: { code: 'DEPARTMENT_CODE_EXISTS', message: 'Department code already exists' },
                    });
                    return;
                }
            }

            const department = await prisma.department.update({
                where: { id },
                data: {
                    ...updateData,
                    code: updateData.code?.toUpperCase(),
                    updatedBy,
                },
            });

            res.json({
                success: true,
                data: {
                    id: department.id,
                    name: department.name,
                    code: department.code,
                    description: department.description,
                    displayOrder: department.displayOrder,
                    isActive: department.isActive,
                },
                message: 'Department updated successfully',
            });
        } catch (error) {
            next(error);
        }
    }
);

/**
 * DELETE /api/v1/settings/departments/:id
 * Soft delete a department
 */
router.delete(
    '/departments/:id',
    authenticate,
    requirePermission('settings', 'delete'),
    validate({ params: IdParamSchema }),
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { id } = req.params;
            const hospitalId = req.user!.hospitalId;
            const updatedBy = req.user!.userId;

            // Verify department exists and belongs to hospital
            const existing = await prisma.department.findFirst({
                where: {
                    id,
                    hospitalId,
                    deletedAt: null,
                },
                include: {
                    _count: {
                        select: { doctors: true },
                    },
                },
            });

            if (!existing) {
                res.status(404).json({
                    success: false,
                    error: { code: 'DEPARTMENT_NOT_FOUND', message: 'Department not found' },
                });
                return;
            }

            // Check if department has active doctors
            if (existing._count.doctors > 0) {
                res.status(400).json({
                    success: false,
                    error: {
                        code: 'DEPARTMENT_HAS_DOCTORS',
                        message: `Cannot delete department with ${existing._count.doctors} active doctor(s). Please reassign doctors first.`,
                    },
                });
                return;
            }

            // Soft delete
            await prisma.department.update({
                where: { id },
                data: {
                    deletedAt: new Date(),
                    updatedBy,
                },
            });

            res.json({
                success: true,
                message: 'Department deleted successfully',
            });
        } catch (error) {
            next(error);
        }
    }
);

// ============================================================================
// ROLES & PERMISSIONS ROUTES
// ============================================================================

/**
 * GET /api/v1/settings/roles
 * List all roles with permission counts
 */
router.get(
    '/roles',
    authenticate,
    async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const roles = await prisma.role.findMany({
                where: { deletedAt: null },
                orderBy: { name: 'asc' },
                include: {
                    _count: {
                        select: {
                            users: true,
                            permissions: true,
                        },
                    },
                },
            });

            res.json({
                success: true,
                data: roles.map((role) => ({
                    id: role.id,
                    name: role.name,
                    code: role.code,
                    description: role.description,
                    isSystemRole: role.isSystemRole,
                    userCount: role._count.users,
                    permissionCount: role._count.permissions,
                })),
            });
        } catch (error) {
            next(error);
        }
    }
);

/**
 * GET /api/v1/settings/roles/:id/permissions
 * Get permissions for a specific role
 */
router.get(
    '/roles/:id/permissions',
    authenticate,
    validate({ params: IdParamSchema }),
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { id } = req.params;

            const role = await prisma.role.findUnique({
                where: { id },
                include: {
                    permissions: {
                        include: {
                            permission: true,
                        },
                    },
                },
            });

            if (!role) {
                res.status(404).json({
                    success: false,
                    error: { code: 'ROLE_NOT_FOUND', message: 'Role not found' },
                });
                return;
            }

            res.json({
                success: true,
                data: {
                    roleId: role.id,
                    roleName: role.name,
                    roleCode: role.code,
                    isSystemRole: role.isSystemRole,
                    permissions: role.permissions.map((rp) => ({
                        id: rp.permission.id,
                        module: rp.permission.module,
                        action: rp.permission.action,
                        description: rp.permission.description,
                    })),
                },
            });
        } catch (error) {
            next(error);
        }
    }
);

/**
 * GET /api/v1/settings/permissions
 * Get all available permissions
 */
router.get(
    '/permissions',
    authenticate,
    async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const permissions = await prisma.permission.findMany({
                orderBy: [{ module: 'asc' }, { action: 'asc' }],
            });

            // Group by module
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
                    permissions,
                    byModule: grouped,
                },
            });
        } catch (error) {
            next(error);
        }
    }
);

/**
 * PUT /api/v1/settings/roles/:id/permissions
 * Update permissions for a role
 */
router.put(
    '/roles/:id/permissions',
    authenticate,
    requirePermission('settings', 'update'),
    validate({
        params: IdParamSchema,
        body: z.object({
            permissionIds: z.array(z.string().cuid('Invalid permission ID')),
        }),
    }),
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { id } = req.params;
            const { permissionIds } = req.body;

            // Check if role exists and is not a system role
            const role = await prisma.role.findUnique({
                where: { id },
            });

            if (!role) {
                res.status(404).json({
                    success: false,
                    error: { code: 'ROLE_NOT_FOUND', message: 'Role not found' },
                });
                return;
            }

            if (role.isSystemRole) {
                res.status(403).json({
                    success: false,
                    error: { code: 'SYSTEM_ROLE', message: 'Cannot modify system role permissions' },
                });
                return;
            }

            // Validate all permission IDs exist
            const existingPermissions = await prisma.permission.findMany({
                where: { id: { in: permissionIds } },
            });

            if (existingPermissions.length !== permissionIds.length) {
                res.status(400).json({
                    success: false,
                    error: { code: 'INVALID_PERMISSIONS', message: 'One or more permission IDs are invalid' },
                });
                return;
            }

            // Update permissions in a transaction
            await prisma.$transaction(async (tx) => {
                // Remove existing permissions
                await tx.rolePermission.deleteMany({
                    where: { roleId: id },
                });

                // Add new permissions
                if (permissionIds.length > 0) {
                    await tx.rolePermission.createMany({
                        data: permissionIds.map((permissionId: string) => ({
                            roleId: id,
                            permissionId,
                        })),
                    });
                }
            });

            res.json({
                success: true,
                message: 'Role permissions updated successfully',
            });
        } catch (error) {
            next(error);
        }
    }
);

export default router;
