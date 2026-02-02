// ============================================================================
// HMS Backend - Patient Routes
// CRUD operations, search, duplicate detection
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

// Import shared types and schemas
import {
    PatientRegistrationSchema,
    PatientUpdateSchema,
    INDIAN_MOBILE_REGEX,
} from '../types/index.js';

// Import service - using direct path for now
import { PatientRegistrationService } from '../services/PatientRegistrationService.js';

const router = Router();
const patientService = new PatientRegistrationService(prisma);

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const PatientSearchQuerySchema = PaginationQuerySchema.extend({
    uhid: z.string().optional(),
    mobile: z.string().regex(INDIAN_MOBILE_REGEX).optional(),
    name: z.string().optional(),
});

const DuplicateCheckSchema = z.object({
    aadhaarNumber: z.string().optional(),
    mobilePrimary: z.string().regex(INDIAN_MOBILE_REGEX, 'Invalid mobile number'),
    firstName: z.string().min(1),
    lastName: z.string().min(1),
});

// ============================================================================
// ROUTES
// ============================================================================

/**
 * GET /api/v1/patients
 * Search and list patients with pagination
 */
router.get(
    '/',
    authenticate,
    requirePermission('patients', 'read'),
    validate({ query: PatientSearchQuerySchema }),
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { page, limit, search, uhid, mobile, name } = req.query as unknown as z.infer<typeof PatientSearchQuerySchema>;
            const hospitalId = req.user!.hospitalId;

            // Build search query
            let searchQuery = search || '';
            if (uhid) searchQuery = uhid;
            if (mobile) searchQuery = mobile;
            if (name) searchQuery = name;

            const { patients, total } = await patientService.searchPatients(
                hospitalId,
                searchQuery,
                {
                    limit,
                    offset: (page - 1) * limit,
                }
            );

            res.json({
                success: true,
                data: patients.map((p) => ({
                    id: p.id,
                    uhid: p.uhid,
                    firstName: p.firstName,
                    lastName: p.lastName,
                    gender: p.gender,
                    dateOfBirth: p.dateOfBirth,
                    mobilePrimary: p.mobilePrimary,
                    city: p.city,
                    patientType: p.patientType,
                    allergies: p.allergies,
                    createdAt: p.createdAt,
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
 * GET /api/v1/patients/:id
 * Get patient by ID
 */
router.get(
    '/:id',
    authenticate,
    requirePermission('patients', 'read'),
    validate({ params: IdParamSchema }),
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { id } = req.params;
            const hospitalId = req.user!.hospitalId;

            const patient = await prisma.patient.findFirst({
                where: {
                    id,
                    hospitalId,
                    deletedAt: null,
                },
                include: {
                    insurancePlan: true,
                },
            });

            if (!patient) {
                res.status(404).json({
                    success: false,
                    error: { code: 'NOT_FOUND', message: 'Patient not found' },
                });
                return;
            }

            // Mask Aadhaar number (show only last 4 digits)
            const maskedAadhaar = patient.aadhaarNumber
                ? `XXXX-XXXX-${patient.aadhaarNumber.slice(-4)}`
                : null;

            res.json({
                success: true,
                data: {
                    ...patient,
                    aadhaarNumber: maskedAadhaar,
                },
            });
        } catch (error) {
            next(error);
        }
    }
);

/**
 * POST /api/v1/patients/check-duplicates
 * Check for duplicate patients before registration
 */
router.post(
    '/check-duplicates',
    authenticate,
    requirePermission('patients', 'create'),
    validate({ body: DuplicateCheckSchema }),
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const hospitalId = req.user!.hospitalId;
            const result = await patientService.checkForDuplicates(hospitalId, req.body);

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
 * POST /api/v1/patients
 * Register a new patient
 */
router.post(
    '/',
    authenticate,
    requirePermission('patients', 'create'),
    validate({ body: PatientRegistrationSchema }),
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const hospitalId = req.user!.hospitalId;
            const userId = req.user!.userId;

            // Get hospital code for UHID generation
            const hospital = await prisma.hospital.findUnique({
                where: { id: hospitalId },
                select: { code: true },
            });

            if (!hospital) {
                res.status(400).json({
                    success: false,
                    error: { code: 'INVALID_HOSPITAL', message: 'Hospital not found' },
                });
                return;
            }

            const skipDuplicateCheck = req.query.skipDuplicateCheck === 'true';

            const result = await patientService.registerPatient(
                hospitalId,
                hospital.code,
                req.body,
                userId,
                skipDuplicateCheck
            );

            if (!result.success) {
                // Check if it's a duplicate warning
                if (result.duplicateCheck?.hasDuplicates) {
                    res.status(409).json({
                        success: false,
                        error: {
                            code: 'POTENTIAL_DUPLICATE',
                            message: result.error,
                        },
                        data: {
                            duplicates: result.duplicateCheck.duplicates,
                        },
                    });
                    return;
                }

                res.status(400).json({
                    success: false,
                    error: { code: 'REGISTRATION_FAILED', message: result.error },
                });
                return;
            }

            res.status(201).json({
                success: true,
                data: {
                    id: result.patient!.id,
                    uhid: result.patient!.uhid,
                    firstName: result.patient!.firstName,
                    lastName: result.patient!.lastName,
                    message: 'Patient registered successfully',
                },
            });
        } catch (error) {
            next(error);
        }
    }
);

/**
 * PUT /api/v1/patients/:id
 * Update patient information
 */
router.put(
    '/:id',
    authenticate,
    requirePermission('patients', 'update'),
    validate({ params: IdParamSchema, body: PatientUpdateSchema }),
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { id } = req.params;
            const hospitalId = req.user!.hospitalId;
            const userId = req.user!.userId;

            const updated = await patientService.updatePatient(
                hospitalId,
                id,
                req.body,
                userId
            );

            if (!updated) {
                res.status(404).json({
                    success: false,
                    error: { code: 'NOT_FOUND', message: 'Patient not found' },
                });
                return;
            }

            res.json({
                success: true,
                data: {
                    id: updated.id,
                    uhid: updated.uhid,
                    message: 'Patient updated successfully',
                },
            });
        } catch (error) {
            next(error);
        }
    }
);

/**
 * DELETE /api/v1/patients/:id
 * Soft delete a patient
 */
router.delete(
    '/:id',
    authenticate,
    requirePermission('patients', 'delete'),
    validate({ params: IdParamSchema }),
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { id } = req.params;
            const hospitalId = req.user!.hospitalId;
            const userId = req.user!.userId;

            const deleted = await patientService.softDeletePatient(hospitalId, id, userId);

            if (!deleted) {
                res.status(404).json({
                    success: false,
                    error: { code: 'NOT_FOUND', message: 'Patient not found' },
                });
                return;
            }

            res.json({
                success: true,
                data: { message: 'Patient deleted successfully' },
            });
        } catch (error) {
            next(error);
        }
    }
);

/**
 * GET /api/v1/patients/:id/history
 * Get patient medical history summary
 */
router.get(
    '/:id/history',
    authenticate,
    requirePermission('patients', 'read'),
    validate({ params: IdParamSchema }),
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { id } = req.params;
            const hospitalId = req.user!.hospitalId;

            // Get last 10 appointments with medical records
            const appointments = await prisma.appointment.findMany({
                where: {
                    patientId: id,
                    hospitalId,
                    deletedAt: null,
                    status: 'COMPLETED',
                },
                include: {
                    doctor: {
                        include: { user: { select: { firstName: true, lastName: true } } },
                    },
                    medicalRecord: {
                        select: {
                            chiefComplaint: true,
                            provisionalDiagnosis: true,
                            consultationDate: true,
                        },
                    },
                },
                orderBy: { appointmentDate: 'desc' },
                take: 10,
            });

            res.json({
                success: true,
                data: appointments.map((apt) => ({
                    appointmentId: apt.id,
                    date: apt.appointmentDate,
                    doctor: `Dr. ${apt.doctor.user.firstName} ${apt.doctor.user.lastName}`,
                    specialization: apt.doctor.specialization,
                    chiefComplaint: apt.medicalRecord?.chiefComplaint,
                    diagnosis: apt.medicalRecord?.provisionalDiagnosis,
                })),
            });
        } catch (error) {
            next(error);
        }
    }
);

export default router;
