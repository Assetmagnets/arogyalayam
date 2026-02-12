// ============================================================================
// HMS Backend - Appointment Routes
// Booking, scheduling, queue management
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
    AppError,
} from '../middleware/index.js';

import {
    AppointmentCreateSchema,
} from '../types/index.js';

const router = Router();

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const AppointmentQuerySchema = PaginationQuerySchema.extend({
    date: z.string().optional(), // ISO date string
    doctorId: z.string().cuid().optional(),
    status: z.enum([
        'SCHEDULED', 'CONFIRMED', 'CHECKED_IN',
        'IN_CONSULTATION', 'COMPLETED', 'CANCELLED', 'NO_SHOW'
    ]).optional(),
});

const AvailableSlotsQuerySchema = z.object({
    doctorId: z.string().cuid('Invalid doctor ID'),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Generate time slots for a doctor on a given date
 */
async function generateTimeSlots(
    doctorId: string,
    date: Date
): Promise<{ time: string; isAvailable: boolean; appointmentId?: string }[]> {
    // Get doctor's schedule for this day of week
    const dayOfWeek = date.getDay();

    const schedules = await prisma.doctorSchedule.findMany({
        where: {
            doctorId,
            dayOfWeek,
            isActive: true,
        },
    });

    if (schedules.length === 0) {
        return [];
    }

    // Get existing appointments for this doctor on this date
    const existingAppointments = await prisma.appointment.findMany({
        where: {
            doctorId,
            appointmentDate: date,
            status: {
                notIn: ['CANCELLED', 'NO_SHOW'],
            },
            deletedAt: null,
        },
        select: {
            id: true,
            slotTime: true,
        },
    });

    const bookedSlots = new Map(
        existingAppointments.map((apt) => [apt.slotTime, apt.id])
    );

    // Generate slots from all schedule blocks
    const slots: { time: string; isAvailable: boolean; appointmentId?: string }[] = [];

    for (const schedule of schedules) {
        const [startHour, startMin] = schedule.startTime.split(':').map(Number);
        const [endHour, endMin] = schedule.endTime.split(':').map(Number);

        let currentMinutes = startHour * 60 + startMin;
        const endMinutes = endHour * 60 + endMin;

        while (currentMinutes < endMinutes) {
            const hours = Math.floor(currentMinutes / 60);
            const mins = currentMinutes % 60;
            const timeStr = `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;

            const appointmentId = bookedSlots.get(timeStr);
            slots.push({
                time: timeStr,
                isAvailable: !appointmentId,
                appointmentId,
            });

            currentMinutes += schedule.slotDuration + schedule.bufferTime;
        }
    }

    // Sort by time
    slots.sort((a, b) => a.time.localeCompare(b.time));

    return slots;
}

/**
 * Generate token number for appointment
 */
async function generateTokenNumber(
    hospitalId: string,
    doctorId: string,
    date: Date
): Promise<string> {
    // Count existing appointments for this doctor on this date
    const count = await prisma.appointment.count({
        where: {
            hospitalId,
            doctorId,
            appointmentDate: date,
            deletedAt: null,
        },
    });

    // Token format: A-001, A-002, etc.
    return `A-${(count + 1).toString().padStart(3, '0')}`;
}

// ============================================================================
// ROUTES
// ============================================================================

/**
 * GET /api/v1/appointments
 * List appointments with filtering
 */
router.get(
    '/',
    authenticate,
    requirePermission('appointments', 'read'),
    validate({ query: AppointmentQuerySchema }),
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { page, limit, date, doctorId, status } = req.query as unknown as z.infer<typeof AppointmentQuerySchema>;
            const hospitalId = req.user!.hospitalId;

            const where: Record<string, unknown> = {
                hospitalId,
                deletedAt: null,
            };

            if (date) {
                where.appointmentDate = new Date(date);
            }
            if (doctorId) {
                where.doctorId = doctorId;
            }
            if (status) {
                where.status = status;
            }

            const [appointments, total] = await Promise.all([
                prisma.appointment.findMany({
                    where,
                    include: {
                        patient: {
                            select: {
                                id: true,
                                uhid: true,
                                firstName: true,
                                lastName: true,
                                mobilePrimary: true,
                                gender: true,
                                dateOfBirth: true,
                                allergies: true,
                            },
                        },
                        doctor: {
                            include: {
                                user: { select: { firstName: true, lastName: true } },
                                department: { select: { name: true } },
                            },
                        },
                    },
                    orderBy: [
                        { appointmentDate: 'asc' },
                        { slotTime: 'asc' },
                    ],
                    skip: (page - 1) * limit,
                    take: limit,
                }),
                prisma.appointment.count({ where }),
            ]);

            res.json({
                success: true,
                data: appointments.map((apt) => ({
                    id: apt.id,
                    tokenNumber: apt.tokenNumber,
                    appointmentDate: apt.appointmentDate,
                    slotTime: apt.slotTime,
                    status: apt.status,
                    consultationType: apt.consultationType,
                    chiefComplaint: apt.chiefComplaint,
                    patient: apt.patient,
                    doctor: {
                        id: apt.doctor.id,
                        name: `Dr. ${apt.doctor.user.firstName} ${apt.doctor.user.lastName}`,
                        department: apt.doctor.department.name,
                        specialization: apt.doctor.specialization,
                    },
                })),
                meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
            });
        } catch (error) {
            next(error);
        }
    }
);

/**
 * GET /api/v1/appointments/slots
 * Get available slots for a doctor on a date
 */
router.get(
    '/slots',
    authenticate,
    validate({ query: AvailableSlotsQuerySchema }),
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { doctorId, date } = req.query as z.infer<typeof AvailableSlotsQuerySchema>;

            const slots = await generateTimeSlots(doctorId, new Date(date));

            res.json({
                success: true,
                data: {
                    doctorId,
                    date,
                    slots,
                    availableCount: slots.filter((s) => s.isAvailable).length,
                    totalCount: slots.length,
                },
            });
        } catch (error) {
            next(error);
        }
    }
);

/**
 * GET /api/v1/appointments/:id
 * Get appointment details
 */
router.get(
    '/:id',
    authenticate,
    requirePermission('appointments', 'read'),
    validate({ params: IdParamSchema }),
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { id } = req.params;
            const hospitalId = req.user!.hospitalId;

            const appointment = await prisma.appointment.findFirst({
                where: { id, hospitalId, deletedAt: null },
                include: {
                    patient: true,
                    doctor: {
                        include: {
                            user: { select: { firstName: true, lastName: true } },
                            department: true,
                        },
                    },
                    opdQueue: true,
                    medicalRecord: true,
                },
            });

            if (!appointment) {
                res.status(404).json({
                    success: false,
                    error: { code: 'NOT_FOUND', message: 'Appointment not found' },
                });
                return;
            }

            res.json({ success: true, data: appointment });
        } catch (error) {
            next(error);
        }
    }
);

/**
 * Generate invoice number
 */
async function generateInvoiceNumber(hospitalId: string): Promise<string> {
    const count = await prisma.invoice.count({
        where: { hospitalId },
    });
    const date = new Date();
    const prefix = `INV-${date.getFullYear().toString().substr(-2)}${(date.getMonth() + 1).toString().padStart(2, '0')}`;
    return `${prefix}-${(count + 1).toString().padStart(4, '0')}`;
}

/**
 * POST /api/v1/appointments
 * Create a new appointment
 */
router.post(
    '/',
    authenticate,
    requirePermission('appointments', 'create'),
    validate({ body: AppointmentCreateSchema }),
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const hospitalId = req.user!.hospitalId;
            const userId = req.user!.userId;
            const { patientId, doctorId, appointmentDate, slotTime, consultationType, chiefComplaint, notes, bookedVia } = req.body;

            // Verify patient exists
            const patient = await prisma.patient.findFirst({
                where: { id: patientId, hospitalId, deletedAt: null },
            });

            if (!patient) {
                throw new AppError('Patient not found', 404, 'PATIENT_NOT_FOUND');
            }

            // Verify doctor exists and is active
            const doctor = await prisma.doctor.findFirst({
                where: { id: doctorId, hospitalId, isActive: true, deletedAt: null },
                include: { user: true },
            });

            if (!doctor) {
                throw new AppError('Doctor not found or inactive', 404, 'DOCTOR_NOT_FOUND');
            }

            // Check if slot is available
            const existingAppointment = await prisma.appointment.findFirst({
                where: {
                    doctorId,
                    appointmentDate: new Date(appointmentDate),
                    slotTime,
                    status: { notIn: ['CANCELLED', 'NO_SHOW'] },
                    deletedAt: null,
                },
            });

            if (existingAppointment) {
                throw new AppError('This time slot is already booked', 409, 'SLOT_UNAVAILABLE');
            }

            // Generate token number
            const tokenNumber = await generateTokenNumber(
                hospitalId,
                doctorId,
                new Date(appointmentDate)
            );

            // Generate Invoice Number
            const invoiceNo = await generateInvoiceNumber(hospitalId);
            const consultationFee = doctor.consultationFee || 0;

            // Create appointment and invoice in transaction
            const [appointment, invoice] = await prisma.$transaction([
                prisma.appointment.create({
                    data: {
                        hospitalId,
                        patientId,
                        doctorId,
                        appointmentDate: new Date(appointmentDate),
                        slotTime,
                        consultationType: consultationType || 'NEW',
                        status: 'SCHEDULED',
                        tokenNumber,
                        tokenPrefix: 'A',
                        chiefComplaint,
                        notes,
                        bookedVia: bookedVia || 'COUNTER',
                        createdBy: userId,
                        updatedBy: userId,
                    },
                }),
                prisma.invoice.create({
                    data: {
                        hospitalId,
                        patientId,
                        invoiceNo,
                        invoiceDate: new Date(),
                        subtotal: consultationFee,
                        totalAmount: consultationFee,
                        balanceAmount: consultationFee,
                        status: 'PENDING',
                        createdBy: userId,
                        updatedBy: userId,
                        items: {
                            create: {
                                description: `Consultation Fee - Dr. ${doctor.user?.firstName || ''} ${doctor.user?.lastName || ''}`,
                                quantity: 1,
                                unitPrice: consultationFee,
                                totalAmount: consultationFee,
                                category: 'Consultation',
                            }
                        }
                    }
                })
            ]);

            // Link Invoice to Appointment (Need separate update because of circular reference or just strict order, easier to update)
            // Actually, we can link appointmentId in invoice creation if we use nested write or simply update invoice after.
            // But strict transaction is better.
            // Let's use update for linkage to be safe and clear.
            await prisma.invoice.update({
                where: { id: invoice.id },
                data: { appointmentId: appointment.id }
            });

            res.status(201).json({
                success: true,
                data: {
                    id: appointment.id,
                    tokenNumber: appointment.tokenNumber,
                    appointmentDate: appointment.appointmentDate,
                    slotTime: appointment.slotTime,
                    patient: {
                        uhid: patient.uhid,
                        name: `${patient.firstName} ${patient.lastName}`,
                    },
                    invoiceId: invoice.id,
                    message: 'Appointment booked successfully',
                },
            });
        } catch (error) {
            next(error);
        }
    }
);

/**
 * PATCH /api/v1/appointments/:id/check-in
 * Check in patient for appointment
 */
router.patch(
    '/:id/check-in',
    authenticate,
    requirePermission('appointments', 'update'),
    validate({ params: IdParamSchema }),
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { id } = req.params;
            const hospitalId = req.user!.hospitalId;
            const userId = req.user!.userId;

            const appointment = await prisma.appointment.findFirst({
                where: { id, hospitalId, deletedAt: null },
            });

            if (!appointment) {
                throw new AppError('Appointment not found', 404, 'NOT_FOUND');
            }

            if (!['SCHEDULED', 'CONFIRMED'].includes(appointment.status)) {
                throw new AppError(
                    `Cannot check in appointment with status: ${appointment.status}`,
                    400,
                    'INVALID_STATUS'
                );
            }

            // Update appointment and create queue entry
            const [updatedAppointment, queueEntry] = await prisma.$transaction([
                prisma.appointment.update({
                    where: { id },
                    data: {
                        status: 'CHECKED_IN',
                        checkedInAt: new Date(),
                        updatedBy: userId,
                    },
                }),
                prisma.opdQueue.create({
                    data: {
                        hospitalId,
                        appointmentId: id,
                        patientId: appointment.patientId,
                        doctorId: appointment.doctorId,
                        queueDate: appointment.appointmentDate,
                        tokenNumber: appointment.tokenNumber!,
                        position: await prisma.opdQueue.count({
                            where: {
                                hospitalId,
                                doctorId: appointment.doctorId,
                                queueDate: appointment.appointmentDate,
                                status: 'WAITING',
                            },
                        }) + 1,
                        status: 'WAITING',
                        checkInTime: new Date(),
                    },
                }),
            ]);

            res.json({
                success: true,
                data: {
                    appointmentId: updatedAppointment.id,
                    queueId: queueEntry.id,
                    tokenNumber: updatedAppointment.tokenNumber,
                    position: queueEntry.position,
                    message: 'Patient checked in successfully',
                },
            });
        } catch (error) {
            next(error);
        }
    }
);

/**
 * PATCH /api/v1/appointments/:id/cancel
 * Cancel an appointment
 */
router.patch(
    '/:id/cancel',
    authenticate,
    requirePermission('appointments', 'update'),
    validate({
        params: IdParamSchema,
        body: z.object({
            reason: z.string().min(1, 'Cancellation reason is required').max(500),
        }),
    }),
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { id } = req.params;
            const { reason } = req.body;
            const hospitalId = req.user!.hospitalId;
            const userId = req.user!.userId;

            const appointment = await prisma.appointment.findFirst({
                where: { id, hospitalId, deletedAt: null },
            });

            if (!appointment) {
                throw new AppError('Appointment not found', 404, 'NOT_FOUND');
            }

            if (['COMPLETED', 'CANCELLED', 'IN_CONSULTATION'].includes(appointment.status)) {
                throw new AppError(
                    `Cannot cancel appointment with status: ${appointment.status}`,
                    400,
                    'INVALID_STATUS'
                );
            }

            const updated = await prisma.appointment.update({
                where: { id },
                data: {
                    status: 'CANCELLED',
                    cancelledAt: new Date(),
                    cancellationReason: reason,
                    updatedBy: userId,
                },
            });

            res.json({
                success: true,
                data: {
                    id: updated.id,
                    status: updated.status,
                    message: 'Appointment cancelled successfully',
                },
            });
        } catch (error) {
            next(error);
        }
    }
);

export default router;
