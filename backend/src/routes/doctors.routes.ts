// ============================================================================
// HMS Backend - Doctor Routes
// Doctor management and schedule management
// ============================================================================

import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
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

const DoctorQuerySchema = PaginationQuerySchema.extend({
    departmentId: z.string().cuid().optional(),
    specialization: z.string().optional(),
    isActive: z.enum(['true', 'false']).optional(),
});

const DoctorScheduleSchema = z.object({
    dayOfWeek: z.number().int().min(0).max(6),
    startTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Invalid time format'),
    endTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Invalid time format'),
    slotDuration: z.number().int().min(5).max(120).default(15),
    bufferTime: z.number().int().min(0).max(30).default(5),
    maxPatients: z.number().int().min(1).optional(),
    isActive: z.boolean().default(true),
});

// ============================================================================
// ROUTES
// ============================================================================

/**
 * GET /api/v1/doctors
 * List doctors with filtering
 */
router.get(
    '/',
    authenticate,
    validate({ query: DoctorQuerySchema }),
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { page, limit, departmentId, specialization, isActive, search } =
                req.query as unknown as z.infer<typeof DoctorQuerySchema>;
            const hospitalId = req.user!.hospitalId;

            const where: Record<string, unknown> = {
                hospitalId,
                deletedAt: null,
            };

            if (departmentId) where.departmentId = departmentId;
            if (specialization) {
                where.specialization = { contains: specialization, mode: 'insensitive' };
            }
            if (isActive !== undefined) {
                where.isActive = isActive === 'true';
            }
            if (search) {
                where.OR = [
                    { specialization: { contains: search, mode: 'insensitive' } },
                    { user: { firstName: { contains: search, mode: 'insensitive' } } },
                    { user: { lastName: { contains: search, mode: 'insensitive' } } },
                ];
            }

            const [doctors, total] = await Promise.all([
                prisma.doctor.findMany({
                    where,
                    include: {
                        user: {
                            select: {
                                firstName: true,
                                lastName: true,
                                email: true,
                                phone: true,
                                avatarUrl: true,
                            },
                        },
                        department: {
                            select: { id: true, name: true, code: true },
                        },
                        schedules: {
                            where: { isActive: true },
                            orderBy: { dayOfWeek: 'asc' },
                        },
                    },
                    skip: (page - 1) * limit,
                    take: limit,
                    orderBy: { user: { firstName: 'asc' } },
                }),
                prisma.doctor.count({ where }),
            ]);

            res.json({
                success: true,
                data: doctors.map((doc) => ({
                    id: doc.id,
                    userId: doc.userId,
                    name: `Dr. ${doc.user.firstName} ${doc.user.lastName}`,
                    email: doc.user.email,
                    phone: doc.user.phone,
                    avatarUrl: doc.user.avatarUrl,
                    registrationNo: doc.registrationNo,
                    qualification: doc.qualification,
                    specialization: doc.specialization,
                    experience: doc.experience,
                    department: doc.department,
                    consultationFee: doc.consultationFee,
                    followUpFee: doc.followUpFee,
                    avgConsultationTime: doc.avgConsultationTime,
                    isActive: doc.isActive,
                    isAvailableOnline: doc.isAvailableOnline,
                    schedules: doc.schedules.map((s) => ({
                        dayOfWeek: s.dayOfWeek,
                        startTime: s.startTime,
                        endTime: s.endTime,
                        slotDuration: s.slotDuration,
                    })),
                })),
                meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
            });
        } catch (error) {
            next(error);
        }
    }
);

/**
 * GET /api/v1/doctors/:id
 * Get doctor details
 */
router.get(
    '/:id',
    authenticate,
    validate({ params: IdParamSchema }),
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { id } = req.params;
            const hospitalId = req.user!.hospitalId;

            const doctor = await prisma.doctor.findFirst({
                where: { id, hospitalId, deletedAt: null },
                include: {
                    user: {
                        select: {
                            firstName: true,
                            lastName: true,
                            email: true,
                            phone: true,
                            avatarUrl: true,
                        },
                    },
                    department: true,
                    schedules: {
                        where: { isActive: true },
                        orderBy: { dayOfWeek: 'asc' },
                    },
                },
            });

            if (!doctor) {
                res.status(404).json({
                    success: false,
                    error: { code: 'NOT_FOUND', message: 'Doctor not found' },
                });
                return;
            }

            res.json({
                success: true,
                data: {
                    ...doctor,
                    name: `Dr. ${doctor.user.firstName} ${doctor.user.lastName}`,
                },
            });
        } catch (error) {
            next(error);
        }
    }
);

/**
 * GET /api/v1/doctors/:id/schedule
 * Get doctor's weekly schedule
 */
router.get(
    '/:id/schedule',
    authenticate,
    validate({ params: IdParamSchema }),
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { id } = req.params;

            const schedules = await prisma.doctorSchedule.findMany({
                where: { doctorId: id, isActive: true },
                orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
            });

            const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

            res.json({
                success: true,
                data: schedules.map((s) => ({
                    id: s.id,
                    dayOfWeek: s.dayOfWeek,
                    dayName: dayNames[s.dayOfWeek],
                    startTime: s.startTime,
                    endTime: s.endTime,
                    slotDuration: s.slotDuration,
                    bufferTime: s.bufferTime,
                    maxPatients: s.maxPatients,
                })),
            });
        } catch (error) {
            next(error);
        }
    }
);

/**
 * POST /api/v1/doctors/:id/schedule
 * Add or update doctor schedule
 */
router.post(
    '/:id/schedule',
    authenticate,
    requirePermission('doctors', 'update'),
    validate({ params: IdParamSchema, body: DoctorScheduleSchema }),
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { id } = req.params;
            const hospitalId = req.user!.hospitalId;

            // Verify doctor exists
            const doctor = await prisma.doctor.findFirst({
                where: { id, hospitalId, deletedAt: null },
            });

            if (!doctor) {
                res.status(404).json({
                    success: false,
                    error: { code: 'NOT_FOUND', message: 'Doctor not found' },
                });
                return;
            }

            const { dayOfWeek, startTime, endTime, slotDuration, bufferTime, maxPatients, isActive } = req.body;

            // Upsert schedule (update if exists for same day and start time)
            const schedule = await prisma.doctorSchedule.upsert({
                where: {
                    doctorId_dayOfWeek_startTime: {
                        doctorId: id,
                        dayOfWeek,
                        startTime,
                    },
                },
                create: {
                    doctorId: id,
                    dayOfWeek,
                    startTime,
                    endTime,
                    slotDuration,
                    bufferTime,
                    maxPatients,
                    isActive,
                },
                update: {
                    endTime,
                    slotDuration,
                    bufferTime,
                    maxPatients,
                    isActive,
                },
            });

            res.json({
                success: true,
                data: {
                    id: schedule.id,
                    message: 'Schedule updated successfully',
                },
            });
        } catch (error) {
            next(error);
        }
    }
);

/**
 * DELETE /api/v1/doctors/:id/schedule/:scheduleId
 * Delete a schedule entry
 */
router.delete(
    '/:id/schedule/:scheduleId',
    authenticate,
    requirePermission('doctors', 'update'),
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { id, scheduleId } = req.params;

            await prisma.doctorSchedule.deleteMany({
                where: {
                    id: scheduleId,
                    doctorId: id,
                },
            });

            res.json({
                success: true,
                data: { message: 'Schedule deleted successfully' },
            });
        } catch (error) {
            next(error);
        }
    }
);

/**
 * GET /api/v1/doctors/departments
 * List all departments with active doctors
 */
router.get(
    '/departments/list',
    authenticate,
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const hospitalId = req.user!.hospitalId;

            const departments = await prisma.department.findMany({
                where: { hospitalId, deletedAt: null, isActive: true },
                include: {
                    doctors: {
                        where: { isActive: true, deletedAt: null },
                        select: { id: true },
                    },
                },
                orderBy: { displayOrder: 'asc' },
            });

            res.json({
                success: true,
                data: departments.map((dept) => ({
                    id: dept.id,
                    name: dept.name,
                    code: dept.code,
                    description: dept.description,
                    doctorCount: dept.doctors.length,
                })),
            });
        } catch (error) {
            next(error);
        }
    }
);

export default router;
