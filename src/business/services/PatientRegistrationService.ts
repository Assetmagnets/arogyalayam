// ============================================================================
// HMS - Enterprise Hospital Management System
// Patient Registration Service
// Implements: Duplicate Detection, UHID Generation, Patient Creation
// ============================================================================

import { PrismaClient, Patient, Prisma } from '@prisma/client';
import {
    PatientRegistration,
    PatientRegistrationSchema,
    DuplicateCheckResult,
    DuplicatePatient,
    UHIDResult,
    UHIDGenerationParams
} from '../../types';

// ============================================================================
// SERVICE CLASS
// ============================================================================

export class PatientRegistrationService {
    private prisma: PrismaClient;

    constructor(prisma: PrismaClient) {
        this.prisma = prisma;
    }

    // ==========================================================================
    // DUPLICATE DETECTION ALGORITHM
    // ==========================================================================

    /**
     * Check for potential duplicate patients before registration
     * 
     * Algorithm:
     * 1. Exact match on Aadhaar number (highest confidence)
     * 2. Match on mobile + similar first name (medium confidence)
     * 
     * @param hospitalId - Hospital ID for multi-tenancy
     * @param input - Patient registration data
     * @returns DuplicateCheckResult with potential duplicates
     */
    async checkForDuplicates(
        hospitalId: string,
        input: Pick<PatientRegistration, 'aadhaarNumber' | 'mobilePrimary' | 'firstName' | 'lastName'>
    ): Promise<DuplicateCheckResult> {
        const duplicates: DuplicatePatient[] = [];

        // Build the OR conditions for duplicate detection
        const orConditions: Prisma.PatientWhereInput[] = [];

        // Condition 1: Exact Aadhaar match (if provided)
        if (input.aadhaarNumber && input.aadhaarNumber.trim() !== '') {
            orConditions.push({
                aadhaarNumber: input.aadhaarNumber,
            });
        }

        // Condition 2: Mobile + First Name match
        // Using case-insensitive comparison for first name
        orConditions.push({
            mobilePrimary: input.mobilePrimary,
            firstName: {
                equals: input.firstName,
                mode: 'insensitive',
            },
        });

        // If no conditions to check, return no duplicates
        if (orConditions.length === 0) {
            return { hasDuplicates: false, duplicates: [] };
        }

        // Query for potential duplicates
        const potentialDuplicates = await this.prisma.patient.findMany({
            where: {
                hospitalId,
                deletedAt: null, // Only active patients
                OR: orConditions,
            },
            select: {
                id: true,
                uhid: true,
                firstName: true,
                lastName: true,
                mobilePrimary: true,
                aadhaarNumber: true,
            },
            take: 10, // Limit results
        });

        // Analyze and score each potential duplicate
        for (const patient of potentialDuplicates) {
            let matchType: 'AADHAAR' | 'MOBILE_NAME' = 'MOBILE_NAME';
            let matchScore = 0;

            // Check for Aadhaar match (highest priority)
            if (
                input.aadhaarNumber &&
                patient.aadhaarNumber &&
                input.aadhaarNumber === patient.aadhaarNumber
            ) {
                matchType = 'AADHAAR';
                matchScore = 100; // Definite match
            }
            // Check for mobile + name match
            else if (patient.mobilePrimary === input.mobilePrimary) {
                matchType = 'MOBILE_NAME';

                // Calculate name similarity score
                const nameScore = this.calculateNameSimilarity(
                    input.firstName,
                    patient.firstName
                );

                // Base score of 70 for mobile match, add name similarity
                matchScore = 70 + Math.round(nameScore * 30);
            }

            duplicates.push({
                id: patient.id,
                uhid: patient.uhid,
                firstName: patient.firstName,
                lastName: patient.lastName,
                mobilePrimary: patient.mobilePrimary,
                aadhaarNumber: patient.aadhaarNumber,
                matchType,
                matchScore,
            });
        }

        // Sort by match score (highest first)
        duplicates.sort((a, b) => b.matchScore - a.matchScore);

        return {
            hasDuplicates: duplicates.length > 0,
            duplicates,
        };
    }

    /**
     * Calculate similarity between two names using Levenshtein distance
     * Returns a value between 0 (no match) and 1 (exact match)
     */
    private calculateNameSimilarity(name1: string, name2: string): number {
        const s1 = name1.toLowerCase().trim();
        const s2 = name2.toLowerCase().trim();

        if (s1 === s2) return 1;
        if (s1.length === 0 || s2.length === 0) return 0;

        // Simple Levenshtein distance calculation
        const matrix: number[][] = [];

        for (let i = 0; i <= s1.length; i++) {
            matrix[i] = [i];
        }
        for (let j = 0; j <= s2.length; j++) {
            matrix[0][j] = j;
        }

        for (let i = 1; i <= s1.length; i++) {
            for (let j = 1; j <= s2.length; j++) {
                const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
                matrix[i][j] = Math.min(
                    matrix[i - 1][j] + 1,      // deletion
                    matrix[i][j - 1] + 1,      // insertion
                    matrix[i - 1][j - 1] + cost // substitution
                );
            }
        }

        const distance = matrix[s1.length][s2.length];
        const maxLength = Math.max(s1.length, s2.length);

        return 1 - distance / maxLength;
    }

    // ==========================================================================
    // UHID GENERATION
    // ==========================================================================

    /**
     * Generate a unique Hospital ID (UHID) for a patient
     * Format: {HospitalCode}-{YYMM}-{SequenceNumber}
     * Example: HOS-2601-0001
     * 
     * Uses database sequence with atomic increment to prevent duplicates
     * 
     * @param params - UHID generation parameters
     * @param tx - Prisma transaction client (optional)
     * @returns UHIDResult with generated UHID
     */
    async generateUHID(
        params: UHIDGenerationParams,
        tx?: Prisma.TransactionClient
    ): Promise<UHIDResult> {
        const client = tx || this.prisma;

        // Get current year and month in YYMM format
        const now = new Date();
        const year = now.getFullYear().toString().slice(-2); // Last 2 digits
        const month = (now.getMonth() + 1).toString().padStart(2, '0');
        const yearMonth = `${year}${month}`;

        // Upsert the sequence counter (atomic operation)
        const sequence = await client.uhidSequence.upsert({
            where: {
                hospitalId_yearMonth: {
                    hospitalId: params.hospitalId,
                    yearMonth,
                },
            },
            create: {
                hospitalId: params.hospitalId,
                yearMonth,
                lastSeq: 1,
            },
            update: {
                lastSeq: {
                    increment: 1,
                },
            },
        });

        // Format sequence number with leading zeros (4 digits minimum)
        const seqStr = sequence.lastSeq.toString().padStart(4, '0');

        // Construct UHID
        const uhid = `${params.hospitalCode}-${yearMonth}-${seqStr}`;

        return {
            uhid,
            yearMonth,
            sequenceNumber: sequence.lastSeq,
        };
    }

    // ==========================================================================
    // PATIENT REGISTRATION
    // ==========================================================================

    /**
     * Register a new patient with all validations
     * 
     * Process:
     * 1. Validate input data using Zod schema
     * 2. Check for duplicate patients
     * 3. Generate UHID within transaction
     * 4. Create patient record atomically
     * 
     * @param hospitalId - Hospital ID for multi-tenancy
     * @param hospitalCode - Hospital code for UHID prefix
     * @param input - Patient registration data
     * @param userId - ID of user performing registration
     * @param skipDuplicateCheck - Skip duplicate check (e.g., user confirmed)
     * @returns Created patient or duplicate check result
     */
    async registerPatient(
        hospitalId: string,
        hospitalCode: string,
        input: PatientRegistration,
        userId: string,
        skipDuplicateCheck: boolean = false
    ): Promise<{
        success: boolean;
        patient?: Patient;
        duplicateCheck?: DuplicateCheckResult;
        error?: string;
    }> {
        // Step 1: Validate input
        const validationResult = PatientRegistrationSchema.safeParse(input);

        if (!validationResult.success) {
            return {
                success: false,
                error: `Validation failed: ${validationResult.error.errors.map((e: { message: string }) => e.message).join(', ')}`,
            };
        }

        const validatedData = validationResult.data;

        // Step 2: Check for duplicates (unless skipped)
        if (!skipDuplicateCheck) {
            const duplicateCheck = await this.checkForDuplicates(hospitalId, {
                aadhaarNumber: validatedData.aadhaarNumber,
                mobilePrimary: validatedData.mobilePrimary,
                firstName: validatedData.firstName,
                lastName: validatedData.lastName,
            });

            // If high-confidence duplicates found, return for user confirmation
            if (duplicateCheck.hasDuplicates) {
                const hasHighConfidenceDuplicate = duplicateCheck.duplicates.some(
                    d => d.matchScore >= 90
                );

                if (hasHighConfidenceDuplicate) {
                    return {
                        success: false,
                        duplicateCheck,
                        error: 'Potential duplicate patient found. Please confirm to proceed.',
                    };
                }
            }
        }

        // Step 3: Create patient within transaction
        try {
            const patient = await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
                // Generate UHID
                const uhidResult = await this.generateUHID(
                    { hospitalId, hospitalCode },
                    tx
                );

                // Create patient record
                const newPatient = await tx.patient.create({
                    data: {
                        hospitalId,
                        uhid: uhidResult.uhid,

                        // Personal Info
                        firstName: validatedData.firstName,
                        middleName: validatedData.middleName || null,
                        lastName: validatedData.lastName,
                        gender: validatedData.gender,
                        dateOfBirth: validatedData.dateOfBirth,
                        bloodGroup: validatedData.bloodGroup || null,
                        maritalStatus: validatedData.maritalStatus || null,
                        occupation: validatedData.occupation || null,

                        // Contact Info
                        mobilePrimary: validatedData.mobilePrimary,
                        mobileSecondary: validatedData.mobileSecondary || null,
                        email: validatedData.email || null,
                        emergencyContact: validatedData.emergencyContact || null,
                        emergencyContactName: validatedData.emergencyContactName || null,
                        emergencyRelation: validatedData.emergencyRelation || null,

                        // Address
                        houseNo: validatedData.houseNo || null,
                        street: validatedData.street || null,
                        area: validatedData.area || null,
                        landmark: validatedData.landmark || null,
                        city: validatedData.city,
                        district: validatedData.district,
                        state: validatedData.state,
                        pinCode: validatedData.pinCode,

                        // Identity (Note: Aadhaar should be encrypted at application level)
                        aadhaarNumber: validatedData.aadhaarNumber || null,
                        abhaId: validatedData.abhaId || null,
                        panNumber: validatedData.panNumber || null,
                        voterId: validatedData.voterId || null,

                        // Type & Insurance
                        patientType: validatedData.patientType,
                        insurancePlanId: validatedData.insurancePlanId || null,
                        insuranceNumber: validatedData.insuranceNumber || null,
                        insuranceValidTill: validatedData.insuranceValidTill || null,

                        // Medical
                        allergies: validatedData.allergies,
                        chronicConditions: validatedData.chronicConditions,

                        // Preferences
                        preferredLanguage: validatedData.preferredLanguage,
                        smsConsent: validatedData.smsConsent,
                        whatsappConsent: validatedData.whatsappConsent,

                        // Audit
                        createdBy: userId,
                        updatedBy: userId,
                    },
                });

                return newPatient;
            });

            return {
                success: true,
                patient,
            };
        } catch (error) {
            // Handle specific Prisma errors
            if (error instanceof Prisma.PrismaClientKnownRequestError) {
                if (error.code === 'P2002') {
                    // Unique constraint violation
                    const target = (error.meta?.target as string[]) || [];
                    if (target.includes('aadhaarNumber')) {
                        return {
                            success: false,
                            error: 'A patient with this Aadhaar number already exists.',
                        };
                    }
                    if (target.includes('uhid')) {
                        return {
                            success: false,
                            error: 'UHID generation conflict. Please try again.',
                        };
                    }
                }
            }

            // Re-throw for unexpected errors
            throw error;
        }
    }

    // ==========================================================================
    // PATIENT LOOKUP
    // ==========================================================================

    /**
     * Find patient by UHID
     */
    async findByUHID(hospitalId: string, uhid: string): Promise<Patient | null> {
        return this.prisma.patient.findFirst({
            where: {
                hospitalId,
                uhid,
                deletedAt: null,
            },
        });
    }

    /**
     * Find patient by mobile number
     */
    async findByMobile(hospitalId: string, mobile: string): Promise<Patient[]> {
        return this.prisma.patient.findMany({
            where: {
                hospitalId,
                OR: [
                    { mobilePrimary: mobile },
                    { mobileSecondary: mobile },
                ],
                deletedAt: null,
            },
            orderBy: {
                createdAt: 'desc',
            },
        });
    }

    /**
     * Search patients by name, UHID, or mobile
     */
    async searchPatients(
        hospitalId: string,
        query: string,
        options: { limit?: number; offset?: number } = {}
    ): Promise<{ patients: Patient[]; total: number }> {
        const { limit = 20, offset = 0 } = options;

        const whereClause: Prisma.PatientWhereInput = {
            hospitalId,
            deletedAt: null,
            OR: [
                { uhid: { contains: query, mode: 'insensitive' } },
                { mobilePrimary: { contains: query } },
                { firstName: { contains: query, mode: 'insensitive' } },
                { lastName: { contains: query, mode: 'insensitive' } },
                {
                    AND: [
                        { firstName: { contains: query.split(' ')[0], mode: 'insensitive' } },
                        { lastName: { contains: query.split(' ')[1] || '', mode: 'insensitive' } },
                    ],
                },
            ],
        };

        const [patients, total] = await Promise.all([
            this.prisma.patient.findMany({
                where: whereClause,
                orderBy: [
                    { firstName: 'asc' },
                    { lastName: 'asc' },
                ],
                take: limit,
                skip: offset,
            }),
            this.prisma.patient.count({ where: whereClause }),
        ]);

        return { patients, total };
    }

    // ==========================================================================
    // PATIENT UPDATE
    // ==========================================================================

    /**
     * Update patient information
     */
    async updatePatient(
        hospitalId: string,
        patientId: string,
        data: Partial<PatientRegistration>,
        userId: string
    ): Promise<Patient | null> {
        // Verify patient exists and belongs to hospital
        const existing = await this.prisma.patient.findFirst({
            where: {
                id: patientId,
                hospitalId,
                deletedAt: null,
            },
        });

        if (!existing) {
            return null;
        }

        // Update with audit trail
        return this.prisma.patient.update({
            where: { id: patientId },
            data: {
                ...data,
                updatedBy: userId,
                updatedAt: new Date(),
            },
        });
    }

    // ==========================================================================
    // SOFT DELETE
    // ==========================================================================

    /**
     * Soft delete a patient
     */
    async softDeletePatient(
        hospitalId: string,
        patientId: string,
        userId: string
    ): Promise<boolean> {
        const result = await this.prisma.patient.updateMany({
            where: {
                id: patientId,
                hospitalId,
                deletedAt: null,
            },
            data: {
                deletedAt: new Date(),
                updatedBy: userId,
            },
        });

        return result.count > 0;
    }
}

// ============================================================================
// FACTORY FUNCTION
// ============================================================================

/**
 * Create a new PatientRegistrationService instance
 */
export function createPatientRegistrationService(
    prisma: PrismaClient
): PatientRegistrationService {
    return new PatientRegistrationService(prisma);
}

export default PatientRegistrationService;
