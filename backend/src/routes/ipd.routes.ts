// ============================================================================
// HMS Backend - IPD Routes
// Inpatient department management - wards, beds, admissions, nursing, discharge
// ============================================================================

import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../config/index.js';
import { authenticate, requirePermission, validate } from '../middleware/index.js';

const router = Router();

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const CreateWardSchema = z.object({
    name: z.string().min(1, 'Ward name is required'),
    code: z.string().min(1, 'Ward code is required').max(10).toUpperCase(),
    type: z.enum(['GENERAL', 'SEMI_PRIVATE', 'PRIVATE', 'ICU', 'NICU', 'PICU', 'CCU', 'ISOLATION', 'EMERGENCY']),
    floor: z.string().optional(),
    building: z.string().optional(),
    dailyRate: z.number().min(0),
    nursingStation: z.string().optional(),
    inCharge: z.string().optional(),
});

const CreateBedSchema = z.object({
    wardId: z.string().min(1, 'Ward is required'),
    bedNumber: z.string().min(1, 'Bed number is required'),
    bedType: z.string().optional(),
    dailyRate: z.number().optional(),
    hasOxygen: z.boolean().optional(),
    hasMonitor: z.boolean().optional(),
    hasVentilator: z.boolean().optional(),
    floor: z.string().optional(),
    wing: z.string().optional(),
});

const AdmitPatientSchema = z.object({
    patientId: z.string().min(1, 'Patient is required'),
    admittingDoctorId: z.string().min(1, 'Admitting doctor is required'),
    bedId: z.string().min(1, 'Bed is required'),
    admissionReason: z.string().min(1, 'Admission reason is required'),
    admissionType: z.enum(['ELECTIVE', 'EMERGENCY']).optional(),
    chiefComplaint: z.string().optional(),
    provisionalDiagnosis: z.string().optional(),
    expectedStayDays: z.number().int().min(1).optional(),
    isInsured: z.boolean().optional(),
    insuranceApprovalNo: z.string().optional(),
});

const NursingNoteSchema = z.object({
    admissionId: z.string().min(1),
    noteType: z.enum(['ROUTINE', 'VITALS', 'MEDICATION', 'OBSERVATION', 'PROCEDURE', 'HANDOVER']),
    shift: z.string().optional(),
    content: z.string().min(1, 'Note content is required'),
    temperature: z.number().optional(),
    bpSystolic: z.number().int().optional(),
    bpDiastolic: z.number().int().optional(),
    pulseRate: z.number().int().optional(),
    respiratoryRate: z.number().int().optional(),
    spO2: z.number().int().optional(),
});

const DoctorRoundSchema = z.object({
    admissionId: z.string().min(1),
    roundType: z.enum(['ROUTINE', 'MORNING', 'EVENING', 'EMERGENCY']).optional(),
    clinicalNotes: z.string().optional(),
    assessment: z.string().optional(),
    plan: z.string().optional(),
    orders: z.string().optional(),
    reviewStatus: z.string().optional(),
    escalationNeeded: z.boolean().optional(),
});

const DischargeSchema = z.object({
    dischargeType: z.enum(['Normal', 'LAMA', 'Referred', 'Expired', 'Absconded']),
    dischargeSummary: z.string().optional(),
    dischargeAdvice: z.string().optional(),
    followUpDate: z.string().optional(),
});

const BedTransferSchema = z.object({
    toBedId: z.string().min(1, 'Target bed is required'),
    reason: z.string().optional(),
    notes: z.string().optional(),
});

// ============================================================================
// IPD DASHBOARD
// ============================================================================

/**
 * GET /api/v1/ipd/dashboard
 * Get IPD dashboard statistics
 */
router.get(
    '/dashboard',
    authenticate,
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const hospitalId = req.user!.hospitalId;
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);

            // Bed statistics
            const bedStats = await prisma.bed.groupBy({
                by: ['status'],
                where: {
                    ward: { hospitalId },
                    deletedAt: null,
                    isActive: true,
                },
                _count: true,
            });

            const totalBeds = bedStats.reduce((acc, curr) => acc + curr._count, 0);
            const bedsByStatus = bedStats.reduce((acc, curr) => {
                acc[curr.status] = curr._count;
                return acc;
            }, {} as Record<string, number>);

            // Admission statistics
            const [currentlyAdmitted, todayAdmissions, todayDischarges] = await Promise.all([
                prisma.admission.count({
                    where: {
                        hospitalId,
                        status: 'ADMITTED',
                        deletedAt: null,
                    },
                }),
                prisma.admission.count({
                    where: {
                        hospitalId,
                        admissionDate: {
                            gte: today,
                            lt: tomorrow,
                        },
                        deletedAt: null,
                    },
                }),
                prisma.admission.count({
                    where: {
                        hospitalId,
                        status: 'DISCHARGED',
                        dischargeDate: {
                            gte: today,
                            lt: tomorrow,
                        },
                        deletedAt: null,
                    },
                }),
            ]);

            // Ward occupancy
            const wards = await prisma.ward.findMany({
                where: {
                    hospitalId,
                    deletedAt: null,
                },
                include: {
                    beds: {
                        where: {
                            deletedAt: null,
                            isActive: true,
                        },
                    },
                },
            });

            const wardOccupancy = wards.map((ward) => {
                const total = ward.beds.length;
                const occupied = ward.beds.filter((b) => b.status === 'OCCUPIED' || b.status === 'RESERVED').length;
                return {
                    id: ward.id,
                    name: ward.name,
                    type: ward.type,
                    totalBeds: total,
                    occupiedBeds: occupied,
                    occupancyRate: total > 0 ? Math.round((occupied / total) * 100) : 0,
                };
            });

            res.json({
                success: true,
                data: {
                    beds: {
                        total: totalBeds,
                        byStatus: bedsByStatus,
                    },
                    admissions: {
                        currentlyAdmitted,
                        todayAdmissions,
                        todayDischarges,
                    },
                    wardOccupancy,
                },
            });
        } catch (error) {
            next(error);
        }
    }
);

// ============================================================================
// WARD MANAGEMENT
// ============================================================================

/**
 * GET /api/v1/ipd/wards
 * List all wards
 */
router.get(
    '/wards',
    authenticate,
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const hospitalId = req.user!.hospitalId;

            const wards = await prisma.ward.findMany({
                where: {
                    hospitalId,
                    deletedAt: null,
                },
                include: {
                    _count: {
                        select: {
                            beds: {
                                where: { deletedAt: null },
                            },
                        },
                    },
                },
                orderBy: { displayOrder: 'asc' },
            });

            // Get bed statistics for each ward
            const wardsWithStats = await Promise.all(
                wards.map(async (ward) => {
                    const bedStats = await prisma.bed.groupBy({
                        by: ['status'],
                        where: {
                            wardId: ward.id,
                            deletedAt: null,
                            isActive: true,
                        },
                        _count: true,
                    });

                    return {
                        ...ward,
                        totalBeds: ward._count.beds,
                        bedStats: bedStats.reduce((acc, s) => {
                            acc[s.status] = s._count;
                            return acc;
                        }, {} as Record<string, number>),
                    };
                })
            );

            res.json({
                success: true,
                data: wardsWithStats,
            });
        } catch (error) {
            next(error);
        }
    }
);

/**
 * POST /api/v1/ipd/wards
 * Create new ward
 */
router.post(
    '/wards',
    authenticate,
    requirePermission('settings', 'create'),
    validate({ body: CreateWardSchema }),
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const hospitalId = req.user!.hospitalId;
            const userId = req.user!.userId;
            const data = req.body;

            const ward = await prisma.ward.create({
                data: {
                    hospitalId,
                    name: data.name,
                    code: data.code,
                    type: data.type,
                    floor: data.floor,
                    building: data.building,
                    dailyRate: data.dailyRate,
                    nursingStation: data.nursingStation,
                    inCharge: data.inCharge,
                    createdBy: userId,
                    updatedBy: userId,
                },
            });

            res.status(201).json({
                success: true,
                data: ward,
                message: 'Ward created successfully',
            });
        } catch (error) {
            next(error);
        }
    }
);

// ============================================================================
// BED MANAGEMENT
// ============================================================================

/**
 * GET /api/v1/ipd/beds
 * List all beds with filters
 */
router.get(
    '/beds',
    authenticate,
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const hospitalId = req.user!.hospitalId;
            const { wardId, status } = req.query;

            const beds = await prisma.bed.findMany({
                where: {
                    ward: { hospitalId },
                    wardId: wardId as string || undefined,
                    status: status as 'AVAILABLE' | 'OCCUPIED' | 'MAINTENANCE' | 'RESERVED' || undefined,
                    deletedAt: null,
                    isActive: true,
                },
                include: {
                    ward: {
                        select: {
                            id: true,
                            name: true,
                            code: true,
                            type: true,
                        },
                    },
                    admissions: {
                        where: {
                            status: 'ADMITTED',
                        },
                        include: {
                            patient: {
                                select: {
                                    id: true,
                                    uhid: true,
                                    firstName: true,
                                    lastName: true,
                                },
                            },
                        },
                        take: 1,
                    },
                },
                orderBy: [
                    { ward: { displayOrder: 'asc' } },
                    { bedNumber: 'asc' },
                ],
            });

            res.json({
                success: true,
                data: beds.map((bed) => ({
                    ...bed,
                    currentPatient: bed.admissions[0]?.patient || null,
                    currentAdmission: bed.admissions[0] || null,
                })),
            });
        } catch (error) {
            next(error);
        }
    }
);

/**
 * POST /api/v1/ipd/beds
 * Create new bed
 */
router.post(
    '/beds',
    authenticate,
    requirePermission('settings', 'create'),
    validate({ body: CreateBedSchema }),
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const userId = req.user!.userId;
            const data = req.body;

            const bed = await prisma.bed.create({
                data: {
                    wardId: data.wardId,
                    bedNumber: data.bedNumber,
                    bedType: data.bedType || 'Regular',
                    dailyRate: data.dailyRate,
                    hasOxygen: data.hasOxygen || false,
                    hasMonitor: data.hasMonitor || false,
                    hasVentilator: data.hasVentilator || false,
                    floor: data.floor,
                    wing: data.wing,
                    createdBy: userId,
                    updatedBy: userId,
                },
            });

            // Update ward total beds count
            await prisma.ward.update({
                where: { id: data.wardId },
                data: {
                    totalBeds: {
                        increment: 1,
                    },
                    updatedBy: userId,
                },
            });

            res.status(201).json({
                success: true,
                data: bed,
                message: 'Bed created successfully',
            });
        } catch (error) {
            next(error);
        }
    }
);

// ============================================================================
// ADMISSION MANAGEMENT
// ============================================================================

/**
 * GET /api/v1/ipd/admissions
 * List admissions with filters
 */
router.get(
    '/admissions',
    authenticate,
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const hospitalId = req.user!.hospitalId;
            const { status, page = '1', limit = '20' } = req.query;

            const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

            const [admissions, total] = await Promise.all([
                prisma.admission.findMany({
                    where: {
                        hospitalId,
                        status: status as 'ADMITTED' | 'DISCHARGED' || undefined,
                        deletedAt: null,
                    },
                    include: {
                        patient: {
                            select: {
                                id: true,
                                uhid: true,
                                firstName: true,
                                lastName: true,
                                gender: true,
                                dateOfBirth: true,
                                mobilePrimary: true,
                            },
                        },
                        admittingDoctor: {
                            select: {
                                id: true,
                                user: {
                                    select: {
                                        firstName: true,
                                        lastName: true,
                                    },
                                },
                                department: {
                                    select: { name: true },
                                },
                            },
                        },
                        bed: {
                            include: {
                                ward: {
                                    select: {
                                        name: true,
                                        type: true,
                                    },
                                },
                            },
                        },
                    },
                    orderBy: { admissionDate: 'desc' },
                    skip,
                    take: parseInt(limit as string),
                }),
                prisma.admission.count({
                    where: {
                        hospitalId,
                        status: status as 'ADMITTED' | 'DISCHARGED' || undefined,
                        deletedAt: null,
                    },
                }),
            ]);

            res.json({
                success: true,
                data: admissions,
                pagination: {
                    total,
                    page: parseInt(page as string),
                    limit: parseInt(limit as string),
                    totalPages: Math.ceil(total / parseInt(limit as string)),
                },
            });
        } catch (error) {
            next(error);
        }
    }
);

/**
 * GET /api/v1/ipd/admissions/:id
 * Get admission details
 */
router.get(
    '/admissions/:id',
    authenticate,
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { id } = req.params;
            const hospitalId = req.user!.hospitalId;

            const admission = await prisma.admission.findUnique({
                where: { id },
                include: {
                    patient: true,
                    admittingDoctor: {
                        include: {
                            user: {
                                select: {
                                    firstName: true,
                                    lastName: true,
                                },
                            },
                            department: true,
                        },
                    },
                    attendingDoctor: {
                        include: {
                            user: {
                                select: {
                                    firstName: true,
                                    lastName: true,
                                },
                            },
                        },
                    },
                    bed: {
                        include: {
                            ward: true,
                        },
                    },
                    nursingNotes: {
                        orderBy: { recordedAt: 'desc' },
                        take: 20,
                    },
                    doctorRounds: {
                        orderBy: { roundDate: 'desc' },
                        take: 10,
                        include: {
                            doctor: {
                                include: {
                                    user: {
                                        select: {
                                            firstName: true,
                                            lastName: true,
                                        },
                                    },
                                },
                            },
                        },
                    },
                    bedTransfers: {
                        orderBy: { transferDate: 'desc' },
                        include: {
                            fromBed: {
                                include: { ward: { select: { name: true } } },
                            },
                            toBed: {
                                include: { ward: { select: { name: true } } },
                            },
                        },
                    },
                },
            });

            if (!admission || admission.hospitalId !== hospitalId) {
                res.status(404).json({
                    success: false,
                    error: { code: 'ADMISSION_NOT_FOUND', message: 'Admission not found' },
                });
                return;
            }

            res.json({
                success: true,
                data: admission,
            });
        } catch (error) {
            next(error);
        }
    }
);

/**
 * POST /api/v1/ipd/admit
 * Admit a patient
 */
router.post(
    '/admit',
    authenticate,
    requirePermission('patients', 'create'),
    validate({ body: AdmitPatientSchema }),
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const hospitalId = req.user!.hospitalId;
            const userId = req.user!.userId;
            const data = req.body;

            // Verify bed is available
            const bed = await prisma.bed.findUnique({
                where: { id: data.bedId },
                include: { ward: true },
            });

            if (!bed || bed.ward.hospitalId !== hospitalId) {
                res.status(404).json({
                    success: false,
                    error: { code: 'BED_NOT_FOUND', message: 'Bed not found' },
                });
                return;
            }

            if (bed.status !== 'AVAILABLE') {
                res.status(400).json({
                    success: false,
                    error: { code: 'BED_NOT_AVAILABLE', message: 'Selected bed is not available' },
                });
                return;
            }

            // Generate admission number
            const now = new Date();
            const yearMonth = `${String(now.getFullYear()).slice(-2)}${String(now.getMonth() + 1).padStart(2, '0')}`;

            const sequence = await prisma.admissionSequence.upsert({
                where: {
                    hospitalId_yearMonth: {
                        hospitalId,
                        yearMonth,
                    },
                },
                update: {
                    lastSeq: { increment: 1 },
                },
                create: {
                    hospitalId,
                    yearMonth,
                    lastSeq: 1,
                },
            });

            const admissionNo = `ADM-${yearMonth}-${String(sequence.lastSeq).padStart(4, '0')}`;

            // Create admission and update bed status
            const [admission] = await prisma.$transaction([
                prisma.admission.create({
                    data: {
                        hospitalId,
                        admissionNo,
                        patientId: data.patientId,
                        admittingDoctorId: data.admittingDoctorId,
                        bedId: data.bedId,
                        admissionReason: data.admissionReason,
                        admissionType: data.admissionType || 'ELECTIVE',
                        chiefComplaint: data.chiefComplaint,
                        provisionalDiagnosis: data.provisionalDiagnosis,
                        expectedStayDays: data.expectedStayDays,
                        expectedDischarge: data.expectedStayDays
                            ? new Date(Date.now() + data.expectedStayDays * 24 * 60 * 60 * 1000)
                            : undefined,
                        isInsured: data.isInsured || false,
                        insuranceApprovalNo: data.insuranceApprovalNo,
                        createdBy: userId,
                        updatedBy: userId,
                    },
                    include: {
                        patient: {
                            select: {
                                uhid: true,
                                firstName: true,
                                lastName: true,
                            },
                        },
                        bed: {
                            include: {
                                ward: {
                                    select: { name: true },
                                },
                            },
                        },
                    },
                }),
                prisma.bed.update({
                    where: { id: data.bedId },
                    data: {
                        status: 'OCCUPIED',
                        updatedBy: userId,
                    },
                }),
            ]);

            res.status(201).json({
                success: true,
                data: admission,
                message: `Patient admitted. Admission No: ${admissionNo}`,
            });
        } catch (error) {
            next(error);
        }
    }
);

/**
 * POST /api/v1/ipd/discharge/:id
 * Discharge a patient
 */
router.post(
    '/discharge/:id',
    authenticate,
    requirePermission('patients', 'update'),
    validate({ body: DischargeSchema }),
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { id } = req.params;
            const hospitalId = req.user!.hospitalId;
            const userId = req.user!.userId;
            const data = req.body;

            const admission = await prisma.admission.findUnique({
                where: { id },
            });

            if (!admission || admission.hospitalId !== hospitalId) {
                res.status(404).json({
                    success: false,
                    error: { code: 'ADMISSION_NOT_FOUND', message: 'Admission not found' },
                });
                return;
            }

            if (admission.status !== 'ADMITTED') {
                res.status(400).json({
                    success: false,
                    error: { code: 'INVALID_STATUS', message: 'Patient is not currently admitted' },
                });
                return;
            }

            const [updatedAdmission] = await prisma.$transaction([
                prisma.admission.update({
                    where: { id },
                    data: {
                        status: 'DISCHARGED',
                        dischargeDate: new Date(),
                        dischargeType: data.dischargeType,
                        dischargeSummary: data.dischargeSummary,
                        dischargeAdvice: data.dischargeAdvice,
                        followUpDate: data.followUpDate ? new Date(data.followUpDate) : undefined,
                        updatedBy: userId,
                    },
                }),
                prisma.bed.update({
                    where: { id: admission.bedId },
                    data: {
                        status: 'AVAILABLE',
                        updatedBy: userId,
                    },
                }),
            ]);

            res.json({
                success: true,
                data: updatedAdmission,
                message: 'Patient discharged successfully',
            });
        } catch (error) {
            next(error);
        }
    }
);

// ============================================================================
// NURSING NOTES
// ============================================================================

/**
 * POST /api/v1/ipd/nursing-note
 * Add nursing note
 */
router.post(
    '/nursing-note',
    authenticate,
    requirePermission('patients', 'update'),
    validate({ body: NursingNoteSchema }),
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const userId = req.user!.userId;
            const data = req.body;

            // Get user name for snapshot
            const user = await prisma.user.findUnique({
                where: { id: userId },
                select: { firstName: true, lastName: true },
            });

            const note = await prisma.nursingNote.create({
                data: {
                    admissionId: data.admissionId,
                    noteType: data.noteType,
                    shift: data.shift,
                    content: data.content,
                    temperature: data.temperature,
                    bpSystolic: data.bpSystolic,
                    bpDiastolic: data.bpDiastolic,
                    pulseRate: data.pulseRate,
                    respiratoryRate: data.respiratoryRate,
                    spO2: data.spO2,
                    recordedBy: userId,
                    recordedByName: user ? `${user.firstName} ${user.lastName}` : undefined,
                },
            });

            res.status(201).json({
                success: true,
                data: note,
                message: 'Nursing note added',
            });
        } catch (error) {
            next(error);
        }
    }
);

// ============================================================================
// DOCTOR ROUNDS
// ============================================================================

/**
 * POST /api/v1/ipd/doctor-round
 * Add doctor round
 */
router.post(
    '/doctor-round',
    authenticate,
    requirePermission('emr', 'create'),
    validate({ body: DoctorRoundSchema }),
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const userId = req.user!.userId;
            const data = req.body;

            // Get doctor ID from user
            const doctor = await prisma.doctor.findUnique({
                where: { userId },
            });

            if (!doctor) {
                res.status(403).json({
                    success: false,
                    error: { code: 'NOT_A_DOCTOR', message: 'Only doctors can add rounds' },
                });
                return;
            }

            const round = await prisma.doctorRound.create({
                data: {
                    admissionId: data.admissionId,
                    doctorId: doctor.id,
                    roundType: data.roundType || 'ROUTINE',
                    clinicalNotes: data.clinicalNotes,
                    assessment: data.assessment,
                    plan: data.plan,
                    orders: data.orders,
                    reviewStatus: data.reviewStatus,
                    escalationNeeded: data.escalationNeeded || false,
                    createdBy: userId,
                    updatedBy: userId,
                },
            });

            res.status(201).json({
                success: true,
                data: round,
                message: 'Doctor round recorded',
            });
        } catch (error) {
            next(error);
        }
    }
);

// ============================================================================
// BED TRANSFER
// ============================================================================

/**
 * POST /api/v1/ipd/transfer-bed/:admissionId
 * Transfer patient to different bed
 */
router.post(
    '/transfer-bed/:admissionId',
    authenticate,
    requirePermission('patients', 'update'),
    validate({ body: BedTransferSchema }),
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { admissionId } = req.params;
            const hospitalId = req.user!.hospitalId;
            const userId = req.user!.userId;
            const { toBedId, reason, notes } = req.body;

            const admission = await prisma.admission.findUnique({
                where: { id: admissionId },
            });

            if (!admission || admission.hospitalId !== hospitalId) {
                res.status(404).json({
                    success: false,
                    error: { code: 'ADMISSION_NOT_FOUND', message: 'Admission not found' },
                });
                return;
            }

            if (admission.status !== 'ADMITTED') {
                res.status(400).json({
                    success: false,
                    error: { code: 'INVALID_STATUS', message: 'Patient is not currently admitted' },
                });
                return;
            }

            // Verify target bed is available
            const targetBed = await prisma.bed.findUnique({
                where: { id: toBedId },
                include: { ward: true },
            });

            if (!targetBed || targetBed.ward.hospitalId !== hospitalId) {
                res.status(404).json({
                    success: false,
                    error: { code: 'BED_NOT_FOUND', message: 'Target bed not found' },
                });
                return;
            }

            if (targetBed.status !== 'AVAILABLE') {
                res.status(400).json({
                    success: false,
                    error: { code: 'BED_NOT_AVAILABLE', message: 'Target bed is not available' },
                });
                return;
            }

            const fromBedId = admission.bedId;

            // Perform transfer
            await prisma.$transaction([
                // Create transfer record
                prisma.bedTransfer.create({
                    data: {
                        admissionId,
                        fromBedId,
                        toBedId,
                        reason,
                        notes,
                        createdBy: userId,
                    },
                }),
                // Update admission with new bed
                prisma.admission.update({
                    where: { id: admissionId },
                    data: {
                        bedId: toBedId,
                        updatedBy: userId,
                    },
                }),
                // Free old bed
                prisma.bed.update({
                    where: { id: fromBedId },
                    data: {
                        status: 'AVAILABLE',
                        updatedBy: userId,
                    },
                }),
                // Occupy new bed
                prisma.bed.update({
                    where: { id: toBedId },
                    data: {
                        status: 'OCCUPIED',
                        updatedBy: userId,
                    },
                }),
            ]);

            res.json({
                success: true,
                message: 'Patient transferred successfully',
            });
        } catch (error) {
            next(error);
        }
    }
);

// ============================================================================
// IPD DASHBOARD
// ============================================================================

/**
 * GET /api/v1/ipd/dashboard
 * Get IPD dashboard statistics
 */
router.get(
    '/dashboard',
    authenticate,
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const hospitalId = req.user!.hospitalId;

            // Get bed statistics
            const bedStats = await prisma.bed.groupBy({
                by: ['status'],
                where: {
                    ward: { hospitalId },
                    deletedAt: null,
                    isActive: true,
                },
                _count: true,
            });

            // Get admission statistics
            const admittedCount = await prisma.admission.count({
                where: {
                    hospitalId,
                    status: 'ADMITTED',
                    deletedAt: null,
                },
            });

            // Get today's admissions
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);

            const todayAdmissions = await prisma.admission.count({
                where: {
                    hospitalId,
                    admissionDate: {
                        gte: today,
                        lt: tomorrow,
                    },
                    deletedAt: null,
                },
            });

            const todayDischarges = await prisma.admission.count({
                where: {
                    hospitalId,
                    dischargeDate: {
                        gte: today,
                        lt: tomorrow,
                    },
                    deletedAt: null,
                },
            });

            // Get ward-wise occupancy
            const wards = await prisma.ward.findMany({
                where: {
                    hospitalId,
                    deletedAt: null,
                    isActive: true,
                },
                select: {
                    id: true,
                    name: true,
                    type: true,
                    totalBeds: true,
                },
            });

            const wardOccupancy = await Promise.all(
                wards.map(async (ward) => {
                    const occupied = await prisma.bed.count({
                        where: {
                            wardId: ward.id,
                            status: 'OCCUPIED',
                            deletedAt: null,
                        },
                    });
                    return {
                        ...ward,
                        occupiedBeds: occupied,
                        occupancyRate: ward.totalBeds > 0
                            ? Math.round((occupied / ward.totalBeds) * 100)
                            : 0,
                    };
                })
            );

            res.json({
                success: true,
                data: {
                    beds: {
                        total: bedStats.reduce((sum, s) => sum + s._count, 0),
                        byStatus: bedStats.reduce((acc, s) => {
                            acc[s.status] = s._count;
                            return acc;
                        }, {} as Record<string, number>),
                    },
                    admissions: {
                        currentlyAdmitted: admittedCount,
                        todayAdmissions,
                        todayDischarges,
                    },
                    wardOccupancy,
                },
            });
        } catch (error) {
            next(error);
        }
    }
);

export default router;
