// ============================================================================
// HMS Backend - IPD Clinical Routes
// Management of Prescriptions, Lab Orders, Surgery Booking for IPD
// ============================================================================

import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../config/index.js';
import { authenticate, requirePermission } from '../middleware/index.js';

const router = Router();

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const CreatePrescriptionSchema = z.object({
    patientId: z.string().min(1),
    admissionId: z.string().min(1),
    medicalRecordId: z.string().optional(),
    items: z.array(z.object({
        drugId: z.string().min(1),
        drugName: z.string(),
        dosage: z.string().optional(),
        frequency: z.enum(['OD', 'BD', 'TDS', 'QID', 'SOS', 'STAT', 'HS', 'AC', 'PC']),
        route: z.enum(['ORAL', 'IV', 'IM', 'SC', 'TOPICAL', 'INHALATION', 'SUBLINGUAL', 'RECTAL', 'OPHTHALMIC', 'OTIC', 'NASAL']).optional().default('ORAL'),
        duration: z.number().int().min(1),
        quantity: z.number().int().min(1),
        instructions: z.string().optional(),
    })).min(1),
    generalInstructions: z.string().optional(),
});

const CreateLabOrderSchema = z.object({
    patientId: z.string().min(1),
    admissionId: z.string().min(1),
    medicalRecordId: z.string().optional(),
    tests: z.array(z.object({
        testName: z.string().min(1),
        category: z.string().optional(),
        price: z.number().optional(),
    })).min(1),
});

const CreateSurgeryBookingSchema = z.object({
    patientId: z.string().min(1),
    admissionId: z.string().optional(),
    doctorId: z.string().min(1),
    otRoomId: z.string().min(1),
    procedureName: z.string().min(1),
    surgeryDate: z.string().datetime(), // ISO string
    startTime: z.string().optional(),
    endTime: z.string().optional(),
    notes: z.string().optional(),
});

// ============================================================================
// PRESCRIPTIONS
// ============================================================================

/**
 * GET /api/v1/ipd/clinical/prescriptions/:admissionId
 * Get all prescriptions for an admission
 */
router.get(
    '/prescriptions/:admissionId',
    authenticate,
    async (req, res): Promise<void> => {
        try {
            const { admissionId } = req.params;
            const prescriptions = await prisma.prescription.findMany({
                where: { admissionId },
                include: {
                    items: true,
                },
                orderBy: { createdAt: 'desc' }
            });
            res.json(prescriptions);
        } catch (error) {
            console.error('Error fetching prescriptions:', error);
            res.status(500).json({ error: 'Failed to fetch prescriptions' });
        }
    }
);

/**
 * POST /api/v1/ipd/clinical/prescriptions
 * Create a new prescription
 */
router.post(
    '/prescriptions',
    authenticate,
    requirePermission('emr', 'create'),
    async (req, res): Promise<void> => {
        try {
            const data = CreatePrescriptionSchema.parse(req.body);
            const user = req.user as any;

            // Generate Prescription No
            const count = await prisma.prescription.count();
            const prescriptionNo = `RX-${new Date().getFullYear()}-${(count + 1).toString().padStart(6, '0')}`;

            const prescription = await prisma.prescription.create({
                data: {
                    prescriptionNo,
                    patientId: data.patientId,
                    admissionId: data.admissionId,
                    medicalRecordId: data.medicalRecordId,
                    generalInstructions: data.generalInstructions,
                    createdBy: user?.id || 'SYSTEM',
                    updatedBy: user?.id || 'SYSTEM',
                    items: {
                        create: data.items.map(item => ({
                            drugId: item.drugId,
                            drugName: item.drugName,
                            dosage: item.dosage,
                            frequency: item.frequency,
                            route: item.route,
                            duration: item.duration,
                            quantity: item.quantity,
                            instructions: item.instructions
                        }))
                    }
                },
                include: { items: true }
            });

            res.status(201).json(prescription);
        } catch (error) {
            console.error('Error creating prescription:', error);
            if (error instanceof z.ZodError) {
                res.status(400).json({ error: error.errors });
                return;
            }
            res.status(500).json({ error: 'Failed to create prescription' });
        }
    }
);

// ============================================================================
// LAB ORDERS
// ============================================================================

/**
 * GET /api/v1/ipd/clinical/lab-orders/:admissionId
 * Get all lab orders for an admission
 */
router.get(
    '/lab-orders/:admissionId',
    authenticate,
    async (req, res): Promise<void> => {
        try {
            const { admissionId } = req.params;
            const orders = await prisma.labOrder.findMany({
                where: { admissionId },
                orderBy: { createdAt: 'desc' }
            });
            res.json(orders);
        } catch (error) {
            console.error('Error fetching lab orders:', error);
            res.status(500).json({ error: 'Failed to fetch lab orders' });
        }
    }
);

/**
 * POST /api/v1/ipd/clinical/lab-orders
 * Create new lab orders
 */
router.post(
    '/lab-orders',
    authenticate,
    requirePermission('emr', 'create'),
    async (req, res): Promise<void> => {
        try {
            const data = CreateLabOrderSchema.parse(req.body);
            const user = req.user as any;

            // Create multiple orders (one per test)
            const createdOrders = [];
            for (const test of data.tests) {
                const order = await prisma.labOrder.create({
                    data: {
                        medicalRecordId: data.medicalRecordId,
                        admissionId: data.admissionId,
                        testName: test.testName,
                        category: test.category,
                        price: test.price, // Prisma handles Decimal from number usually, but better to ensure
                        createdBy: user?.id || 'SYSTEM',
                        updatedBy: user?.id || 'SYSTEM',
                    }
                });
                createdOrders.push(order);
            }

            res.status(201).json(createdOrders);
        } catch (error) {
            console.error('Error creating lab orders:', error);
            if (error instanceof z.ZodError) {
                res.status(400).json({ error: error.errors });
                return;
            }
            res.status(500).json({ error: 'Failed to create lab orders' });
        }
    }
);

// ============================================================================
// SURGERY & OT
// ============================================================================

/**
 * GET /api/v1/ipd/clinical/ot-rooms
 * List all OT rooms and their status
 */
router.get(
    '/ot-rooms',
    authenticate,
    async (req, res): Promise<void> => {
        try {
            const { hospitalId } = req.user as any;
            const rooms = await prisma.oTRoom.findMany({
                where: { hospitalId },
                orderBy: { name: 'asc' }
            });
            res.json(rooms);
        } catch (error) {
            console.error('Error fetching OT rooms:', error);
            res.status(500).json({ error: 'Failed to fetch OT rooms' });
        }
    }
);

/**
 * POST /api/v1/ipd/clinical/surgeries
 * Book a surgery
 */
router.post(
    '/surgeries',
    authenticate,
    requirePermission('ipd', 'create'),
    async (req, res): Promise<void> => {
        try {
            const data = CreateSurgeryBookingSchema.parse(req.body);
            const user = req.user as any;
            const { hospitalId } = user;

            const booking = await prisma.surgeryBooking.create({
                data: {
                    hospitalId,
                    patientId: data.patientId,
                    admissionId: data.admissionId,
                    doctorId: data.doctorId,
                    otRoomId: data.otRoomId,
                    procedureName: data.procedureName,
                    surgeryDate: new Date(data.surgeryDate),
                    startTime: data.startTime,
                    endTime: data.endTime,
                    preOpNotes: data.notes,
                    createdBy: user?.id || 'SYSTEM',
                    updatedBy: user?.id || 'SYSTEM',
                }
            });

            res.status(201).json(booking);
        } catch (error) {
            console.error('Error booking surgery:', error);
            if (error instanceof z.ZodError) {
                res.status(400).json({ error: error.errors });
                return;
            }
            res.status(500).json({ error: 'Failed to book surgery' });
        }
    }
);

/**
 * GET /api/v1/ipd/clinical/surgeries
 * List surgeries (calendar view support)
 */
router.get(
    '/surgeries',
    authenticate,
    async (req, res): Promise<void> => {
        try {
            const user = req.user as any;
            const { hospitalId } = user;
            const { start, end } = req.query; // Date range

            const whereClause: any = { hospitalId };
            if (start && end) {
                whereClause.surgeryDate = {
                    gte: new Date(start as string),
                    lte: new Date(end as string)
                };
            }

            const bookings = await prisma.surgeryBooking.findMany({
                where: whereClause,
                include: {
                    patient: { select: { firstName: true, lastName: true, uhid: true } },
                    doctor: {
                        include: {
                            user: { select: { firstName: true, lastName: true } }
                        }
                    },
                    otRoom: { select: { name: true } }
                },
                orderBy: { surgeryDate: 'asc' }
            });

            const transformedBookings = bookings.map(b => ({
                ...b,
                doctorName: `${b.doctor.user.firstName} ${b.doctor.user.lastName}`,
                patientName: `${b.patient.firstName} ${b.patient.lastName}`
            }));

            res.json(transformedBookings);
        } catch (error) {
            console.error('Error fetching surgeries:', error);
            res.status(500).json({ error: 'Failed to fetch surgeries' });
        }
    }
);

export default router;
