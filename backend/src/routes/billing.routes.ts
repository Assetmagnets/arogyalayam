// ============================================================================
// HMS Backend - Billing Routes
// Invoice management, payments, and service master
// ============================================================================

import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../config/index.js'; // Adjust import path if needed
import { authenticate, requirePermission, validate, IdParamSchema } from '../middleware/index.js';

const router = Router();

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const CreateInvoiceItemSchema = z.object({
    serviceId: z.string().optional(), // Optional for ad-hoc items
    description: z.string().min(1),
    category: z.string().optional(),
    quantity: z.number().int().min(1),
    unitPrice: z.number().min(0),
    discountPercent: z.number().min(0).max(100).optional(),
    discountAmount: z.number().min(0).optional(),
    taxPercent: z.number().min(0).max(100).optional(),
    taxAmount: z.number().min(0).optional(),
    totalAmount: z.number().min(0),
});

const CreateInvoiceSchema = z.object({
    patientId: z.string().cuid(),
    appointmentId: z.string().cuid().optional(),
    admissionId: z.string().cuid().optional(),
    invoiceDate: z.string().datetime().optional(),
    dueDate: z.string().datetime().optional(),
    items: z.array(CreateInvoiceItemSchema).min(1),
    subtotal: z.number().min(0),
    discountAmount: z.number().min(0).optional(),
    discountReason: z.string().optional(),
    taxAmount: z.number().min(0).optional(),
    totalAmount: z.number().min(0),
    notes: z.string().optional(),
    // Initial payment (optional)
    initialPayment: z.object({
        amount: z.number().min(0),
        paymentMode: z.enum(['CASH', 'CARD', 'UPI', 'NETBANKING', 'CHEQUE', 'INSURANCE_CLAIM', 'PMJAY_CLAIM']),
        referenceNo: z.string().optional(),
        notes: z.string().optional(),
    }).optional(),
});

const AddPaymentSchema = z.object({
    invoiceId: z.string().cuid(),
    amount: z.number().min(0.01),
    paymentMode: z.enum(['CASH', 'CARD', 'UPI', 'NETBANKING', 'CHEQUE', 'INSURANCE_CLAIM', 'PMJAY_CLAIM']),
    referenceNo: z.string().optional(),
    notes: z.string().optional(),
    paymentDate: z.string().datetime().optional(),
});

// ============================================================================
// ROUTES
// ============================================================================

/**
 * GET /api/v1/billing/services
 * Search services by name or code
 */
router.get(
    '/services',
    authenticate,
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const hospitalId = req.user!.hospitalId;
            const { q, category } = req.query;

            const where: any = {
                hospitalId,
                isActive: true,
                deletedAt: null,
            };

            if (q) {
                where.OR = [
                    { name: { contains: String(q), mode: 'insensitive' } },
                    { code: { contains: String(q), mode: 'insensitive' } },
                ];
            }

            if (category) {
                where.category = String(category);
            }

            const services = await prisma.serviceMaster.findMany({
                where,
                orderBy: { name: 'asc' },
                take: 50,
            });

            res.json({
                success: true,
                data: services,
            });
        } catch (error) {
            next(error);
        }
    }
);

/**
 * GET /api/v1/billing/invoices
 * List invoices with pagination and filtering
 */
router.get(
    '/invoices',
    authenticate,
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const hospitalId = req.user!.hospitalId;
            const { page = '1', limit = '10', search, status, startDate, endDate } = req.query;

            const pageNum = parseInt(String(page));
            const limitNum = parseInt(String(limit));
            const skip = (pageNum - 1) * limitNum;

            const where: any = {
                hospitalId,
            };

            if (status) {
                where.status = String(status);
            }

            if (startDate || endDate) {
                where.invoiceDate = {};
                if (startDate) where.invoiceDate.gte = new Date(String(startDate));
                if (endDate) where.invoiceDate.lte = new Date(String(endDate));
            }

            if (search) {
                where.OR = [
                    { invoiceNo: { contains: String(search), mode: 'insensitive' } },
                    {
                        patient: {
                            OR: [
                                { firstName: { contains: String(search), mode: 'insensitive' } },
                                { lastName: { contains: String(search), mode: 'insensitive' } },
                                { uhid: { contains: String(search), mode: 'insensitive' } },
                                { mobilePrimary: { contains: String(search), mode: 'insensitive' } }
                            ]
                        }
                    }
                ];
            }

            const [invoices, total] = await Promise.all([
                prisma.invoice.findMany({
                    where,
                    include: {
                        patient: {
                            select: {
                                firstName: true,
                                lastName: true,
                                uhid: true,
                            }
                        }
                    },
                    orderBy: { invoiceDate: 'desc' },
                    skip,
                    take: limitNum,
                }),
                prisma.invoice.count({ where })
            ]);

            res.json({
                success: true,
                data: invoices,
                pagination: {
                    page: pageNum,
                    limit: limitNum,
                    total,
                    totalPages: Math.ceil(total / limitNum),
                }
            });
        } catch (error) {
            next(error);
        }
    }
);

/**
 * GET /api/v1/billing/patient-details/:id
 * Get patient details for billing context (insurance, recent headers)
 */
router.get(
    '/patient-details/:id',
    authenticate,
    validate({ params: IdParamSchema }),
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { id } = req.params;
            const hospitalId = req.user!.hospitalId;

            const patient = await prisma.patient.findFirst({
                where: { id, hospitalId },
                include: {
                    insurancePlan: true,
                    // Optionally include active admission or recent appointment
                    admissions: {
                        where: { status: 'ADMITTED' },
                        take: 1,
                    },
                    appointments: {
                        where: {
                            status: { in: ['SCHEDULED', 'CHECKED_IN', 'IN_CONSULTATION'] },
                            appointmentDate: {
                                gte: new Date(new Date().setHours(0, 0, 0, 0)) // Today/Future
                            }
                        },
                        take: 1,
                        orderBy: { appointmentDate: 'desc' }
                    }
                },
            });

            if (!patient) {
                res.status(404).json({
                    success: false,
                    error: { code: 'PATIENT_NOT_FOUND', message: 'Patient not found' },
                });
                return;
            }

            // Calculate simple "Advance/Balance" context from previous invoices if needed?
            // For now, return basic info.

            res.json({
                success: true,
                data: patient,
            });
        } catch (error) {
            next(error);
        }
    }
);

/**
 * POST /api/v1/billing/invoices
 * Create a new invoice
 */
router.post(
    '/invoices',
    authenticate,
    requirePermission('billing', 'create'),
    validate({ body: CreateInvoiceSchema }),
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const hospitalId = req.user!.hospitalId;
            const createdBy = req.user!.userId;
            const {
                patientId, appointmentId, admissionId,
                items,
                initialPayment,
                invoiceDate,
                ...totals
            } = req.body;

            // Generate Invoice Number
            // NOTE: In production, needs a robust sequence generator. 
            // Using a simple timestamp/random combo for MVP to avoid race conditions blocked by detailed sequence implementation.
            const dateStr = new Date().toISOString().slice(2, 10).replace(/-/g, '');
            const randomSuffix = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
            const invoiceNo = `INV-${dateStr}-${randomSuffix}`;

            const result = await prisma.$transaction(async (tx) => {
                // 1. Create Invoice
                const invoice = await tx.invoice.create({
                    data: {
                        hospitalId,
                        invoiceNo,
                        patientId,
                        appointmentId,
                        admissionId,
                        invoiceDate: invoiceDate ? new Date(invoiceDate) : new Date(),
                        subtotal: totals.subtotal,
                        discountAmount: totals.discountAmount || 0,
                        discountReason: totals.discountReason,
                        taxAmount: totals.taxAmount || 0,
                        totalAmount: totals.totalAmount,
                        balanceAmount: totals.totalAmount - (initialPayment?.amount || 0),
                        paidAmount: initialPayment?.amount || 0,
                        status: initialPayment && initialPayment.amount >= totals.totalAmount
                            ? 'PAID'
                            : initialPayment?.amount > 0
                                ? 'PARTIALLY_PAID'
                                : 'PENDING',
                        createdBy,
                        updatedBy: createdBy,
                        items: {
                            create: items.map((item: any) => ({
                                serviceId: item.serviceId,
                                description: item.description,
                                category: item.category,
                                quantity: item.quantity,
                                unitPrice: item.unitPrice,
                                discountPercent: item.discountPercent,
                                discountAmount: item.discountAmount || 0,
                                taxPercent: item.taxPercent,
                                taxAmount: item.taxAmount || 0,
                                totalAmount: item.totalAmount,
                            }))
                        }
                    },
                });

                // 2. Process Initial Payment if exists
                if (initialPayment && initialPayment.amount > 0) {
                    // Generate Payment Number
                    const payRandom = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
                    const paymentNo = `PAY-${dateStr}-${payRandom}`;

                    await tx.payment.create({
                        data: {
                            invoiceId: invoice.id,
                            paymentNo,
                            amount: initialPayment.amount,
                            paymentMode: initialPayment.paymentMode,
                            referenceNo: initialPayment.referenceNo,
                            notes: initialPayment.notes,
                            createdBy,
                            updatedBy: createdBy,
                        }
                    });
                }

                return invoice;
            });

            res.status(201).json({
                success: true,
                data: result,
                message: 'Invoice created successfully',
            });
        } catch (error) {
            next(error);
        }
    }
);

/**
 * GET /api/v1/billing/invoices/:id
 * Get invoice details
 */
router.get(
    '/invoices/:id',
    authenticate,
    validate({ params: IdParamSchema }),
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { id } = req.params;
            const hospitalId = req.user!.hospitalId;

            const invoice = await prisma.invoice.findFirst({
                where: { id, hospitalId },
                include: {
                    patient: {
                        select: {
                            firstName: true,
                            lastName: true,
                            uhid: true,
                            mobilePrimary: true,
                            houseNo: true,
                            street: true,
                            area: true,
                            city: true,
                            state: true,
                            pinCode: true,
                        }
                    },
                    items: true,
                    payments: {
                        orderBy: { paymentDate: 'desc' }
                    },
                    hospital: {
                        select: {
                            name: true,
                            addressLine1: true,
                            addressLine2: true,
                            city: true,
                            state: true,
                            pinCode: true,
                            phone: true,
                            email: true,
                            logoUrl: true,
                        }
                    }
                }
            });

            if (!invoice) {
                res.status(404).json({
                    success: false,
                    error: { code: 'INVOICE_NOT_FOUND', message: 'Invoice not found' },
                });
                return;
            }

            res.json({
                success: true,
                data: invoice,
            });
        } catch (error) {
            next(error);
        }
    }
);

/**
 * POST /api/v1/billing/payments
 * Add payment to existing invoice
 */
router.post(
    '/payments',
    authenticate,
    requirePermission('billing', 'create'), // or update?
    validate({ body: AddPaymentSchema }),
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const hospitalId = req.user!.hospitalId;
            const createdBy = req.user!.userId;
            const { invoiceId, amount, paymentMode, referenceNo, notes, paymentDate } = req.body;

            const result = await prisma.$transaction(async (tx) => {
                const invoice = await tx.invoice.findFirst({
                    where: { id: invoiceId, hospitalId },
                });

                if (!invoice) {
                    throw { status: 404, message: 'Invoice not found' };
                }

                if (Number(invoice.balanceAmount) < amount) {
                    // Allow overpayment? usually no.
                    // throw { status: 400, message: 'Payment exceeds balance amount' };
                }

                const dateStr = new Date().toISOString().slice(2, 10).replace(/-/g, '');
                const payRandom = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
                const paymentNo = `PAY-${dateStr}-${payRandom}`;

                const payment = await tx.payment.create({
                    data: {
                        invoiceId,
                        paymentNo,
                        amount,
                        paymentMode,
                        referenceNo,
                        notes,
                        paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
                        createdBy,
                        updatedBy: createdBy,
                    }
                });

                // Update invoice
                const newPaid = Number(invoice.paidAmount) + amount;
                const newBalance = Number(invoice.totalAmount) - newPaid;
                const newStatus = newBalance <= 0.5 ? 'PAID' : 'PARTIALLY_PAID'; // Small epsilon for float issues

                await tx.invoice.update({
                    where: { id: invoiceId },
                    data: {
                        paidAmount: newPaid,
                        balanceAmount: newBalance,
                        status: newStatus,
                        updatedBy: createdBy,
                    }
                });

                return payment;
            });

            res.json({
                success: true,
                data: result,
                message: 'Payment added successfully',
            });
        } catch (error) {
            next(error);
        }
    }
);

export default router;
