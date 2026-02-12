// ============================================================================
// HMS Backend - OPD Routes
// Outpatient department management - queue, check-in, consultation
// ============================================================================

import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../config/index.js';
import { authenticate, requirePermission, validate } from '../middleware/index.js';

const router = Router();

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const CheckInSchema = z.object({
    chiefComplaint: z.string().optional(),
});

// ============================================================================
// OPD DASHBOARD
// ============================================================================

/**
 * GET /api/v1/opd/dashboard
 * Get OPD dashboard statistics
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

            // Get today's appointment counts by status
            const appointmentStats = await prisma.appointment.groupBy({
                by: ['status'],
                where: {
                    hospitalId,
                    appointmentDate: {
                        gte: today,
                        lt: tomorrow,
                    },
                    deletedAt: null,
                },
                _count: true,
            });

            // Get queue statistics
            const queueStats = await prisma.opdQueue.groupBy({
                by: ['status'],
                where: {
                    hospitalId,
                    queueDate: {
                        gte: today,
                        lt: tomorrow,
                    },
                },
                _count: true,
            });

            // Get doctor-wise queue
            const doctorQueues = await prisma.doctor.findMany({
                where: {
                    hospitalId,
                    isActive: true,
                    deletedAt: null,
                },
                select: {
                    id: true,
                    user: {
                        select: {
                            firstName: true,
                            lastName: true,
                        },
                    },
                    department: {
                        select: {
                            name: true,
                        },
                    },
                    _count: {
                        select: {
                            opdQueues: {
                                where: {
                                    queueDate: {
                                        gte: today,
                                        lt: tomorrow,
                                    },
                                    status: 'WAITING',
                                },
                            },
                        },
                    },
                },
            });

            const formattedDoctorQueues = doctorQueues.map((d) => ({
                doctorId: d.id,
                doctorName: `Dr. ${d.user.firstName} ${d.user.lastName}`,
                department: d.department.name,
                waitingCount: d._count.opdQueues,
            }));

            res.json({
                success: true,
                data: {
                    date: today.toISOString().split('T')[0],
                    appointments: {
                        total: appointmentStats.reduce((sum, s) => sum + s._count, 0),
                        byStatus: appointmentStats.reduce((acc, s) => {
                            acc[s.status] = s._count;
                            return acc;
                        }, {} as Record<string, number>),
                    },
                    queue: {
                        total: queueStats.reduce((sum, s) => sum + s._count, 0),
                        byStatus: queueStats.reduce((acc, s) => {
                            acc[s.status] = s._count;
                            return acc;
                        }, {} as Record<string, number>),
                    },
                    doctorQueues: formattedDoctorQueues,
                },
            });
        } catch (error) {
            next(error);
        }
    }
);

// ============================================================================
// QUEUE MANAGEMENT
// ============================================================================

/**
 * GET /api/v1/opd/queue/:doctorId
 * Get current queue for a doctor
 */
router.get(
    '/queue/:doctorId',
    authenticate,
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { doctorId } = req.params;
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);

            const queue = await prisma.opdQueue.findMany({
                where: {
                    doctorId,
                    queueDate: {
                        gte: today,
                        lt: tomorrow,
                    },
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
                    appointment: {
                        select: {
                            consultationType: true,
                            chiefComplaint: true,
                        },
                    },
                },
                orderBy: [
                    { status: 'asc' },
                    { position: 'asc' },
                ],
            });

            // Get current patient (IN_CONSULTATION)
            const currentPatient = queue.find((q) => q.status === 'IN_CONSULTATION');

            res.json({
                success: true,
                data: {
                    doctorId,
                    date: today.toISOString().split('T')[0],
                    currentPatient: currentPatient || null,
                    queue: queue.map((q) => ({
                        ...q,
                        patientAge: Math.floor(
                            (Date.now() - new Date(q.patient.dateOfBirth).getTime()) /
                            (365.25 * 24 * 60 * 60 * 1000)
                        ),
                    })),
                    stats: {
                        waiting: queue.filter((q) => q.status === 'WAITING').length,
                        completed: queue.filter((q) => q.status === 'COMPLETED').length,
                        inConsultation: queue.filter((q) => q.status === 'IN_CONSULTATION').length,
                    },
                },
            });
        } catch (error) {
            next(error);
        }
    }
);

/**
 * POST /api/v1/opd/checkin/:appointmentId
 * Check-in patient for appointment (add to queue)
 */
router.post(
    '/checkin/:appointmentId',
    authenticate,
    requirePermission('appointments', 'update'),
    validate({ body: CheckInSchema }),
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { appointmentId } = req.params;
            const hospitalId = req.user!.hospitalId;
            const { chiefComplaint } = req.body;

            // Get appointment
            const appointment = await prisma.appointment.findUnique({
                where: { id: appointmentId },
                include: {
                    opdQueue: true,
                },
            });

            if (!appointment || appointment.hospitalId !== hospitalId) {
                res.status(404).json({
                    success: false,
                    error: { code: 'APPOINTMENT_NOT_FOUND', message: 'Appointment not found' },
                });
                return;
            }

            if (appointment.status !== 'SCHEDULED' && appointment.status !== 'CONFIRMED') {
                res.status(400).json({
                    success: false,
                    error: { code: 'INVALID_STATUS', message: 'Appointment cannot be checked in' },
                });
                return;
            }

            if (appointment.opdQueue) {
                res.status(400).json({
                    success: false,
                    error: { code: 'ALREADY_CHECKED_IN', message: 'Patient already checked in' },
                });
                return;
            }

            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);

            // Get next position in queue
            const lastInQueue = await prisma.opdQueue.findFirst({
                where: {
                    doctorId: appointment.doctorId,
                    queueDate: {
                        gte: today,
                        lt: tomorrow,
                    },
                },
                orderBy: { position: 'desc' },
            });

            const nextPosition = (lastInQueue?.position || 0) + 1;

            // Generate token number
            const tokenNumber = `${appointment.tokenPrefix || 'A'}-${String(nextPosition).padStart(3, '0')}`;

            // Create queue entry and update appointment
            const [queue] = await prisma.$transaction([
                prisma.opdQueue.create({
                    data: {
                        hospitalId,
                        appointmentId,
                        patientId: appointment.patientId,
                        doctorId: appointment.doctorId,
                        queueDate: today,
                        tokenNumber,
                        position: nextPosition,
                        checkInTime: new Date(),
                        estimatedWait: nextPosition * 15, // Rough estimate
                    },
                }),
                prisma.appointment.update({
                    where: { id: appointmentId },
                    data: {
                        status: 'CHECKED_IN',
                        tokenNumber,
                        checkedInAt: new Date(),
                        chiefComplaint: chiefComplaint || appointment.chiefComplaint,
                        updatedBy: req.user!.userId,
                    },
                }),
            ]);

            res.json({
                success: true,
                data: queue,
                message: `Patient checked in. Token: ${tokenNumber}`,
            });
        } catch (error) {
            next(error);
        }
    }
);

/**
 * POST /api/v1/opd/call-next/:doctorId
 * Call next patient in queue for consultation
 */
router.post(
    '/call-next/:doctorId',
    authenticate,
    requirePermission('appointments', 'update'),
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { doctorId } = req.params;


            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);

            // Check if there's already a patient in consultation
            const currentPatient = await prisma.opdQueue.findFirst({
                where: {
                    doctorId,
                    queueDate: {
                        gte: today,
                        lt: tomorrow,
                    },
                    status: 'IN_CONSULTATION',
                },
            });

            if (currentPatient) {
                res.status(400).json({
                    success: false,
                    error: {
                        code: 'PATIENT_IN_CONSULTATION',
                        message: 'Please complete current consultation first',
                    },
                });
                return;
            }

            // Get next waiting patient
            const nextPatient = await prisma.opdQueue.findFirst({
                where: {
                    doctorId,
                    queueDate: {
                        gte: today,
                        lt: tomorrow,
                    },
                    status: 'WAITING',
                },
                orderBy: { position: 'asc' },
                include: {
                    patient: {
                        select: {
                            uhid: true,
                            firstName: true,
                            lastName: true,
                        },
                    },
                },
            });

            if (!nextPatient) {
                res.status(404).json({
                    success: false,
                    error: { code: 'NO_WAITING_PATIENTS', message: 'No patients waiting in queue' },
                });
                return;
            }

            // Update queue and appointment status
            const now = new Date();
            const [updatedQueue] = await prisma.$transaction([
                prisma.opdQueue.update({
                    where: { id: nextPatient.id },
                    data: {
                        status: 'IN_CONSULTATION',
                        callTime: now,
                        startTime: now,
                        actualWait: Math.floor(
                            (now.getTime() - (nextPatient.checkInTime?.getTime() || now.getTime())) /
                            60000
                        ),
                    },
                }),
                prisma.appointment.update({
                    where: { id: nextPatient.appointmentId },
                    data: {
                        status: 'IN_CONSULTATION',
                        consultationStartAt: now,
                        updatedBy: req.user!.userId,
                    },
                }),
            ]);

            res.json({
                success: true,
                data: {
                    ...updatedQueue,
                    patient: nextPatient.patient,
                },
                message: `Called patient: ${nextPatient.patient.firstName} ${nextPatient.patient.lastName}`,
            });
        } catch (error) {
            next(error);
        }
    }
);

/**
 * POST /api/v1/opd/complete/:queueId
 * Complete consultation for patient
 */
router.post(
    '/complete/:queueId',
    authenticate,
    requirePermission('appointments', 'update'),
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { queueId } = req.params;
            const hospitalId = req.user!.hospitalId;
            const { clinicalNotes, diagnosis, prescription, advice, vitals } = req.body;

            const queue = await prisma.opdQueue.findUnique({
                where: { id: queueId },
            });

            if (!queue || queue.hospitalId !== hospitalId) {
                res.status(404).json({
                    success: false,
                    error: { code: 'QUEUE_NOT_FOUND', message: 'Queue entry not found' },
                });
                return;
            }

            if (queue.status !== 'IN_CONSULTATION') {
                res.status(400).json({
                    success: false,
                    error: { code: 'INVALID_STATUS', message: 'Patient is not in consultation' },
                });
                return;
            }

            const [updatedQueue] = await prisma.$transaction(async (tx) => {
                const q = await tx.opdQueue.update({
                    where: { id: queueId },
                    data: {
                        status: 'COMPLETED',
                        endTime: new Date(),
                    },
                });

                await tx.appointment.update({
                    where: { id: queue.appointmentId },
                    data: {
                        status: 'COMPLETED',
                        consultationEndAt: new Date(),
                        updatedBy: req.user!.userId,
                    },
                });

                // Create Medical Record
                const mr = await tx.medicalRecord.create({
                    data: {
                        patientId: queue.patientId,
                        doctorId: queue.doctorId,
                        appointmentId: queue.appointmentId,
                        consultationType: 'NEW', // Defaulting for now
                        clinicalNotes: clinicalNotes,
                        provisionalDiagnosis: diagnosis,
                        treatmentPlan: prescription, // Mapping prescription text to treatment plan
                        advice: advice,
                        createdBy: req.user!.userId,
                        updatedBy: req.user!.userId,
                    }
                });

                // Create Vitals if provided
                if (vitals && Object.keys(vitals).length > 0) {
                    await tx.vital.create({
                        data: {
                            patientId: queue.patientId,
                            medicalRecordId: mr.id,
                            bpSystolic: vitals.bpSystolic,
                            bpDiastolic: vitals.bpDiastolic,
                            pulseRate: vitals.pulseRate,
                            temperatureF: vitals.temperatureF,
                            spO2: vitals.spO2,
                            weightKg: vitals.weightKg,
                            heightCm: vitals.heightCm,
                            recordedBy: req.user!.userId,
                        }
                    });
                }

                return [q, mr];
            });

            res.json({
                success: true,
                data: updatedQueue,
                message: 'Consultation completed and medical record saved',
            });
        } catch (error) {
            next(error);
        }
    }
);

/**
 * POST /api/v1/opd/skip/:queueId
 * Skip patient in queue (mark as no-show or skipped)
 */
router.post(
    '/skip/:queueId',
    authenticate,
    requirePermission('appointments', 'update'),
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { queueId } = req.params;
            const hospitalId = req.user!.hospitalId;
            const { reason } = req.body;

            const queue = await prisma.opdQueue.findUnique({
                where: { id: queueId },
            });

            if (!queue || queue.hospitalId !== hospitalId) {
                res.status(404).json({
                    success: false,
                    error: { code: 'QUEUE_NOT_FOUND', message: 'Queue entry not found' },
                });
                return;
            }

            const [updatedQueue] = await prisma.$transaction([
                prisma.opdQueue.update({
                    where: { id: queueId },
                    data: {
                        status: 'SKIPPED',
                    },
                }),
                prisma.appointment.update({
                    where: { id: queue.appointmentId },
                    data: {
                        status: 'NO_SHOW',
                        cancellationReason: reason || 'Skipped',
                        updatedBy: req.user!.userId,
                    },
                }),
            ]);

            res.json({
                success: true,
                data: updatedQueue,
                message: 'Patient skipped',
            });
        } catch (error) {
            next(error);
        }
    }
);

export default router;
