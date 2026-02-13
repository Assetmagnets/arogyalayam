// ============================================================================
// HMS Backend - EMR Routes
// Electronic Medical Records management
// ============================================================================

import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../config/index.js';
import { authenticate, requirePermission } from '../middleware/index.js';

const router = Router();

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const CreateMedicalRecordSchema = z.object({
    patientId: z.string().min(1),
    doctorId: z.string().min(1),
    appointmentId: z.string().optional(),
    admissionId: z.string().optional(),

    // Vitals
    vitals: z.object({
        temperature: z.number().optional(),
        bpSystolic: z.number().int().optional(),
        bpDiastolic: z.number().int().optional(),
        pulseRate: z.number().int().optional(),
        respiratoryRate: z.number().int().optional(),
        spO2: z.number().int().optional(),
        weight: z.number().optional(),
        height: z.number().optional(),
        bmi: z.number().optional(),
    }).optional(),

    // Clinical Notes
    chiefComplaint: z.string().min(1),
    historyOfPresentIllness: z.string().optional(),
    pastMedicalHistory: z.string().optional(), // Corrected from pastHistory
    familyHistory: z.string().optional(),
    allergies: z.array(z.string()).optional(), // Array of strings for Patient update

    // Examination
    examinationFindings: z.string().optional(), // Corrected from examinationNotes

    // Diagnosis
    provisionalDiagnosis: z.string().optional(),
    finalDiagnosis: z.string().optional(),
    icdCodes: z.array(z.string()).optional(), // Array of ICD-10 Code IDs

    // Plan
    treatmentPlan: z.string().optional(),
    followUpDate: z.string().datetime().optional(),
});

// ============================================================================
// ROUTES
// ============================================================================

/**
 * GET /api/v1/emr/patient/:patientId
 * Get medical history for a patient
 */
router.get(
    '/patient/:patientId',
    authenticate,
    async (req, res): Promise<void> => {
        try {
            const { patientId } = req.params;
            const records = await prisma.medicalRecord.findMany({
                where: { patientId },
                include: {
                    doctor: {
                        include: {
                            user: {
                                select: { firstName: true, lastName: true }
                            }
                        }
                    },
                    diagnoses: { include: { icdCode: true } },
                },
                orderBy: { createdAt: 'desc' }
            });

            // Transform response to include full doctor name
            const transformedRecords = records.map(record => ({
                ...record,
                doctorName: `${record.doctor.user.firstName} ${record.doctor.user.lastName}`
            }));

            res.json(transformedRecords);
        } catch (error) {
            console.error('Error fetching medical history:', error);
            res.status(500).json({ error: 'Failed to fetch medical history' });
        }
    }
);

/**
 * GET /api/v1/emr/:id
 * Get specific medical record
 */
router.get(
    '/:id',
    authenticate,
    async (req, res): Promise<void> => {
        try {
            const { id } = req.params;
            const record = await prisma.medicalRecord.findUnique({
                where: { id },
                include: {
                    doctor: {
                        include: {
                            user: {
                                select: { firstName: true, lastName: true }
                            }
                        }
                    },
                    patient: {
                        select: {
                            firstName: true,
                            lastName: true,
                            uhid: true,
                            gender: true,
                            dateOfBirth: true
                        }
                    },
                    diagnoses: { include: { icdCode: true } },
                    vitals: true,
                    // documents: true // Removed as it doesn't exist
                }
            });

            if (!record) {
                res.status(404).json({ error: 'Medical record not found' });
                return;
            }

            const transformedRecord = {
                ...record,
                doctorName: `${record.doctor.user.firstName} ${record.doctor.user.lastName}`,
                patientName: `${record.patient.firstName} ${record.patient.lastName}`
            };

            res.json(transformedRecord);
        } catch (error) {
            console.error('Error fetching medical record:', error);
            res.status(500).json({ error: 'Failed to fetch medical record' });
        }
    }
);

/**
 * POST /api/v1/emr
 * Create a new medical record
 */
router.post(
    '/',
    authenticate,
    requirePermission('emr', 'create'),
    async (req, res): Promise<void> => {
        try {
            const data = CreateMedicalRecordSchema.parse(req.body);
            const user = req.user as any;
            // req.user type might be Express.User which doesn't have id directly without casting or extension
            // Assuming authenticate middleware populates user.

            // Handle Allergies update on Patient if provided
            if (data.allergies && data.allergies.length > 0) {
                await prisma.patient.update({
                    where: { id: data.patientId },
                    data: {
                        allergies: {
                            push: data.allergies
                        }
                    }
                });
            }

            const record = await prisma.medicalRecord.create({
                data: {
                    patientId: data.patientId,
                    doctorId: data.doctorId,
                    appointmentId: data.appointmentId,
                    admissionId: data.admissionId,

                    consultationType: 'NEW', // Default or from input?

                    chiefComplaint: data.chiefComplaint,
                    historyOfPresentIllness: data.historyOfPresentIllness,
                    pastMedicalHistory: data.pastMedicalHistory,
                    familyHistory: data.familyHistory,
                    // allergies: data.allergies, // Not on MedicalRecord
                    examinationFindings: data.examinationFindings,
                    treatmentPlan: data.treatmentPlan,
                    followUpDate: data.followUpDate ? new Date(data.followUpDate) : undefined,

                    createdBy: user?.id || 'SYSTEM',
                    updatedBy: user?.id || 'SYSTEM',

                    diagnoses: data.icdCodes ? {
                        create: data.icdCodes.map(codeId => ({
                            icdCodeId: codeId,
                            isPrimary: true
                        }))
                    } : undefined,

                    vitals: data.vitals ? {
                        create: {
                            patientId: data.patientId,
                            temperatureF: data.vitals.temperature,
                            bpSystolic: data.vitals.bpSystolic,
                            bpDiastolic: data.vitals.bpDiastolic,
                            pulseRate: data.vitals.pulseRate,
                            respiratoryRate: data.vitals.respiratoryRate,
                            spO2: data.vitals.spO2,
                            weightKg: data.vitals.weight,
                            heightCm: data.vitals.height,
                            bmiValue: data.vitals.bmi,
                            recordedBy: user?.id || 'SYSTEM'
                        }
                    } : undefined
                }
            });

            // Link record to appointment if exists
            if (data.appointmentId) {
                await prisma.appointment.update({
                    where: { id: data.appointmentId },
                    data: { status: 'COMPLETED' }
                });

                // Update Queue status
                await prisma.opdQueue.updateMany({
                    where: { appointmentId: data.appointmentId },
                    data: { status: 'COMPLETED' }
                });
            }

            res.status(201).json(record);
        } catch (error) {
            console.error('Error creating medical record:', error);
            if (error instanceof z.ZodError) {
                res.status(400).json({ error: error.errors });
                return;
            }
            res.status(500).json({ error: 'Failed to create medical record' });
        }
    }
);

export default router;
