// ============================================================================
// HMS - Enterprise Hospital Management System
// Shared Types and Zod Validation Schemas
// ============================================================================

import { z } from 'zod';

// ============================================================================
// INDIAN-SPECIFIC REGEX PATTERNS
// ============================================================================

/**
 * Indian mobile number: Must start with 6, 7, 8, or 9 followed by 9 digits
 * Valid examples: 9876543210, 7012345678
 */
export const INDIAN_MOBILE_REGEX = /^[6-9]\d{9}$/;

/**
 * Aadhaar number: Exactly 12 digits
 * Note: Actual Aadhaar uses Verhoeff checksum, simplified here to 12 digits
 */
export const AADHAAR_REGEX = /^\d{12}$/;

/**
 * Indian PIN code: Exactly 6 digits, first digit cannot be 0
 */
export const PIN_CODE_REGEX = /^[1-9]\d{5}$/;

/**
 * ABHA ID format: 14 digits formatted as XX-XXXX-XXXX-XXXX
 */
export const ABHA_REGEX = /^\d{2}-\d{4}-\d{4}-\d{4}$/;

/**
 * PAN Number: 5 letters, 4 digits, 1 letter (e.g., ABCDE1234F)
 */
export const PAN_REGEX = /^[A-Z]{5}\d{4}[A-Z]$/;

/**
 * GST Number: 15 characters alphanumeric
 */
export const GST_REGEX = /^\d{2}[A-Z]{5}\d{4}[A-Z]\d[Z][A-Z\d]$/;

/**
 * UHID Format: HOS-YYMM-NNNN (e.g., HOS-2601-0001)
 */
export const UHID_REGEX = /^[A-Z]{3,5}-\d{4}-\d{4,6}$/;

// ============================================================================
// ENUMS (Mirror Prisma Enums)
// ============================================================================

export const GenderEnum = z.enum(['MALE', 'FEMALE', 'OTHER']);
export type Gender = z.infer<typeof GenderEnum>;

export const BloodGroupEnum = z.enum([
  'A_POSITIVE', 'A_NEGATIVE',
  'B_POSITIVE', 'B_NEGATIVE',
  'AB_POSITIVE', 'AB_NEGATIVE',
  'O_POSITIVE', 'O_NEGATIVE',
  'UNKNOWN'
]);
export type BloodGroup = z.infer<typeof BloodGroupEnum>;

export const PatientTypeEnum = z.enum(['CASH', 'INSURANCE', 'PMJAY', 'CORPORATE']);
export type PatientType = z.infer<typeof PatientTypeEnum>;

export const AppointmentStatusEnum = z.enum([
  'SCHEDULED', 'CONFIRMED', 'CHECKED_IN', 
  'IN_CONSULTATION', 'COMPLETED', 'CANCELLED', 'NO_SHOW'
]);
export type AppointmentStatus = z.infer<typeof AppointmentStatusEnum>;

export const QueueStatusEnum = z.enum([
  'WAITING', 'IN_CONSULTATION', 'COMPLETED', 'NO_SHOW', 'SKIPPED'
]);
export type QueueStatus = z.infer<typeof QueueStatusEnum>;

export const ConsultationTypeEnum = z.enum(['NEW', 'FOLLOW_UP', 'EMERGENCY', 'REFERRAL']);
export type ConsultationType = z.infer<typeof ConsultationTypeEnum>;

export const PrescriptionFrequencyEnum = z.enum([
  'OD',   // Once daily
  'BD',   // Twice daily
  'TDS',  // Three times daily
  'QID',  // Four times daily
  'SOS',  // As needed
  'STAT', // Immediately
  'HS',   // At bedtime
  'AC',   // Before meals
  'PC'    // After meals
]);
export type PrescriptionFrequency = z.infer<typeof PrescriptionFrequencyEnum>;

export const DrugRouteEnum = z.enum([
  'ORAL', 'IV', 'IM', 'SC', 'TOPICAL', 
  'INHALATION', 'SUBLINGUAL', 'RECTAL', 
  'OPHTHALMIC', 'OTIC', 'NASAL'
]);
export type DrugRoute = z.infer<typeof DrugRouteEnum>;

export const AlertLevelEnum = z.enum(['HIGH', 'MEDIUM', 'LOW']);
export type AlertLevel = z.infer<typeof AlertLevelEnum>;

export const InvoiceStatusEnum = z.enum([
  'DRAFT', 'PENDING', 'PARTIALLY_PAID', 'PAID', 'CANCELLED', 'REFUNDED'
]);
export type InvoiceStatus = z.infer<typeof InvoiceStatusEnum>;

export const PaymentModeEnum = z.enum([
  'CASH', 'CARD', 'UPI', 'NETBANKING', 'CHEQUE', 'INSURANCE_CLAIM', 'PMJAY_CLAIM'
]);
export type PaymentMode = z.infer<typeof PaymentModeEnum>;

export const UserStatusEnum = z.enum([
  'ACTIVE', 'INACTIVE', 'SUSPENDED', 'PENDING_VERIFICATION'
]);
export type UserStatus = z.infer<typeof UserStatusEnum>;

export const BatchStatusEnum = z.enum([
  'AVAILABLE', 'LOW_STOCK', 'OUT_OF_STOCK', 'EXPIRED', 'RECALLED'
]);
export type BatchStatus = z.infer<typeof BatchStatusEnum>;

// ============================================================================
// INDIAN VALIDATION SCHEMAS
// ============================================================================

/**
 * Indian Mobile Number Schema
 * - Must be exactly 10 digits
 * - Must start with 6, 7, 8, or 9
 */
export const IndianMobileSchema = z
  .string()
  .length(10, 'Mobile number must be exactly 10 digits')
  .regex(INDIAN_MOBILE_REGEX, 'Invalid Indian mobile number. Must start with 6, 7, 8, or 9');

/**
 * Aadhaar Number Schema
 * - Must be exactly 12 digits
 * - Optional Verhoeff checksum validation can be added
 */
export const AadhaarSchema = z
  .string()
  .length(12, 'Aadhaar number must be exactly 12 digits')
  .regex(AADHAAR_REGEX, 'Invalid Aadhaar number format');

/**
 * Indian PIN Code Schema
 * - Must be exactly 6 digits
 * - First digit cannot be 0
 */
export const PinCodeSchema = z
  .string()
  .length(6, 'PIN code must be exactly 6 digits')
  .regex(PIN_CODE_REGEX, 'Invalid PIN code. First digit cannot be 0');

/**
 * ABHA ID Schema (Ayushman Bharat Health Account)
 * - Format: XX-XXXX-XXXX-XXXX (14 digits with hyphens)
 */
export const AbhaIdSchema = z
  .string()
  .regex(ABHA_REGEX, 'Invalid ABHA ID format. Expected: XX-XXXX-XXXX-XXXX');

/**
 * PAN Number Schema
 * - Format: AAAAA9999A
 */
export const PanSchema = z
  .string()
  .length(10, 'PAN must be exactly 10 characters')
  .regex(PAN_REGEX, 'Invalid PAN format. Expected: AAAAA9999A')
  .toUpperCase();

/**
 * GST Number Schema
 * - Format: 22AAAAA0000A1Z5
 */
export const GstSchema = z
  .string()
  .length(15, 'GST number must be exactly 15 characters')
  .regex(GST_REGEX, 'Invalid GST number format')
  .toUpperCase();

// ============================================================================
// ADDRESS SCHEMA
// ============================================================================

export const AddressSchema = z.object({
  houseNo: z.string().max(50).optional(),
  street: z.string().max(100).optional(),
  area: z.string().max(100).optional(),
  landmark: z.string().max(100).optional(),
  city: z.string().min(1, 'City is required').max(100),
  district: z.string().min(1, 'District is required').max(100),
  state: z.string().min(1, 'State is required').max(100),
  pinCode: PinCodeSchema,
  country: z.string().default('India'),
});
export type Address = z.infer<typeof AddressSchema>;

// ============================================================================
// PATIENT SCHEMAS
// ============================================================================

/**
 * Personal Information Schema
 */
export const PersonalInfoSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(100),
  middleName: z.string().max(100).optional(),
  lastName: z.string().min(1, 'Last name is required').max(100),
  gender: GenderEnum,
  dateOfBirth: z.coerce.date({
    required_error: 'Date of birth is required',
    invalid_type_error: 'Invalid date format',
  }).refine((date) => date <= new Date(), {
    message: 'Date of birth cannot be in the future',
  }),
  bloodGroup: BloodGroupEnum.optional(),
  maritalStatus: z.string().max(20).optional(),
  occupation: z.string().max(100).optional(),
});
export type PersonalInfo = z.infer<typeof PersonalInfoSchema>;

/**
 * Contact Information Schema
 */
export const ContactInfoSchema = z.object({
  mobilePrimary: IndianMobileSchema,
  mobileSecondary: IndianMobileSchema.optional().or(z.literal('')),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  emergencyContact: IndianMobileSchema.optional().or(z.literal('')),
  emergencyContactName: z.string().max(100).optional(),
  emergencyRelation: z.string().max(50).optional(),
});
export type ContactInfo = z.infer<typeof ContactInfoSchema>;

/**
 * Identity Documents Schema (Indian)
 */
export const IdentitySchema = z.object({
  aadhaarNumber: AadhaarSchema.optional().or(z.literal('')),
  abhaId: AbhaIdSchema.optional().or(z.literal('')),
  panNumber: PanSchema.optional().or(z.literal('')),
  voterId: z.string().max(20).optional(),
});
export type IdentityDocuments = z.infer<typeof IdentitySchema>;

/**
 * Complete Patient Registration Schema
 */
export const PatientRegistrationSchema = z.object({
  // Personal Info
  ...PersonalInfoSchema.shape,
  
  // Contact Info
  mobilePrimary: IndianMobileSchema,
  mobileSecondary: IndianMobileSchema.optional().or(z.literal('')),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  emergencyContact: IndianMobileSchema.optional().or(z.literal('')),
  emergencyContactName: z.string().max(100).optional(),
  emergencyRelation: z.string().max(50).optional(),
  
  // Address
  houseNo: z.string().max(50).optional(),
  street: z.string().max(100).optional(),
  area: z.string().max(100).optional(),
  landmark: z.string().max(100).optional(),
  city: z.string().min(1, 'City is required').max(100),
  district: z.string().min(1, 'District is required').max(100),
  state: z.string().min(1, 'State is required').max(100),
  pinCode: PinCodeSchema,
  
  // Identity
  aadhaarNumber: AadhaarSchema.optional().or(z.literal('')),
  abhaId: AbhaIdSchema.optional().or(z.literal('')),
  panNumber: PanSchema.optional().or(z.literal('')),
  voterId: z.string().max(20).optional(),
  
  // Type & Insurance
  patientType: PatientTypeEnum.default('CASH'),
  insurancePlanId: z.string().cuid().optional(),
  insuranceNumber: z.string().max(50).optional(),
  insuranceValidTill: z.coerce.date().optional(),
  
  // Medical
  allergies: z.array(z.string()).default([]),
  chronicConditions: z.array(z.string()).default([]),
  
  // Preferences
  preferredLanguage: z.string().default('en'),
  smsConsent: z.boolean().default(true),
  whatsappConsent: z.boolean().default(false),
});
export type PatientRegistration = z.infer<typeof PatientRegistrationSchema>;

/**
 * Patient Update Schema (Partial)
 */
export const PatientUpdateSchema = PatientRegistrationSchema.partial();
export type PatientUpdate = z.infer<typeof PatientUpdateSchema>;

// ============================================================================
// DUPLICATE DETECTION RESULT
// ============================================================================

export interface DuplicatePatient {
  id: string;
  uhid: string;
  firstName: string;
  lastName: string;
  mobilePrimary: string;
  aadhaarNumber?: string | null;
  matchType: 'AADHAAR' | 'MOBILE_NAME';
  matchScore: number; // 0-100
}

export interface DuplicateCheckResult {
  hasDuplicates: boolean;
  duplicates: DuplicatePatient[];
}

// ============================================================================
// VITALS SCHEMA
// ============================================================================

export const VitalsSchema = z.object({
  heightCm: z.coerce.number()
    .min(30, 'Height must be at least 30 cm')
    .max(300, 'Height cannot exceed 300 cm')
    .optional(),
  
  weightKg: z.coerce.number()
    .min(0.5, 'Weight must be at least 0.5 kg')
    .max(500, 'Weight cannot exceed 500 kg')
    .optional(),
  
  bpSystolic: z.coerce.number()
    .int('Systolic BP must be a whole number')
    .min(50, 'Systolic BP seems too low')
    .max(300, 'Systolic BP seems too high')
    .optional(),
  
  bpDiastolic: z.coerce.number()
    .int('Diastolic BP must be a whole number')
    .min(30, 'Diastolic BP seems too low')
    .max(200, 'Diastolic BP seems too high')
    .optional(),
  
  pulseRate: z.coerce.number()
    .int('Pulse rate must be a whole number')
    .min(30, 'Pulse rate seems too low')
    .max(250, 'Pulse rate seems too high')
    .optional(),
  
  respiratoryRate: z.coerce.number()
    .int('Respiratory rate must be a whole number')
    .min(5, 'Respiratory rate seems too low')
    .max(60, 'Respiratory rate seems too high')
    .optional(),
  
  temperatureF: z.coerce.number()
    .min(90, 'Temperature seems too low')
    .max(110, 'Temperature seems too high')
    .optional(),
  
  spO2: z.coerce.number()
    .int('SpO2 must be a whole number')
    .min(50, 'SpO2 seems too low')
    .max(100, 'SpO2 cannot exceed 100%')
    .optional(),
  
  bloodSugarFasting: z.coerce.number().min(20).max(700).optional(),
  bloodSugarPP: z.coerce.number().min(20).max(700).optional(),
  bloodSugarRandom: z.coerce.number().min(20).max(700).optional(),
  
  painScore: z.coerce.number()
    .int('Pain score must be a whole number')
    .min(0, 'Pain score cannot be negative')
    .max(10, 'Pain score cannot exceed 10')
    .optional(),
  
  notes: z.string().max(500).optional(),
}).refine(
  (data) => {
    // If both systolic and diastolic are provided, systolic must be greater
    if (data.bpSystolic && data.bpDiastolic) {
      return data.bpSystolic > data.bpDiastolic;
    }
    return true;
  },
  {
    message: 'Systolic BP must be greater than diastolic BP',
    path: ['bpSystolic'],
  }
);
export type Vitals = z.infer<typeof VitalsSchema>;

/**
 * BMI Categories based on WHO/Indian standards
 */
export type BMICategory = 'Underweight' | 'Normal' | 'Overweight' | 'Obese Class I' | 'Obese Class II' | 'Obese Class III';

export interface BMIResult {
  value: number;
  category: BMICategory;
  isHealthy: boolean;
}

/**
 * Calculate BMI and determine category
 * @param heightCm Height in centimeters
 * @param weightKg Weight in kilograms
 * @returns BMI result with value and category
 */
export function calculateBMI(heightCm: number, weightKg: number): BMIResult {
  const heightM = heightCm / 100;
  const bmi = weightKg / (heightM * heightM);
  const roundedBmi = Math.round(bmi * 10) / 10;
  
  let category: BMICategory;
  let isHealthy = false;
  
  if (roundedBmi < 18.5) {
    category = 'Underweight';
  } else if (roundedBmi < 25) {
    category = 'Normal';
    isHealthy = true;
  } else if (roundedBmi < 30) {
    category = 'Overweight';
  } else if (roundedBmi < 35) {
    category = 'Obese Class I';
  } else if (roundedBmi < 40) {
    category = 'Obese Class II';
  } else {
    category = 'Obese Class III';
  }
  
  return { value: roundedBmi, category, isHealthy };
}

// ============================================================================
// APPOINTMENT SCHEMAS
// ============================================================================

export const AppointmentCreateSchema = z.object({
  patientId: z.string().cuid('Invalid patient ID'),
  doctorId: z.string().cuid('Invalid doctor ID'),
  appointmentDate: z.coerce.date({
    required_error: 'Appointment date is required',
  }).refine((date) => date >= new Date(new Date().setHours(0, 0, 0, 0)), {
    message: 'Appointment date cannot be in the past',
  }),
  slotTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Invalid time format. Use HH:mm'),
  consultationType: ConsultationTypeEnum.default('NEW'),
  chiefComplaint: z.string().max(500).optional(),
  notes: z.string().max(1000).optional(),
  bookedVia: z.enum(['COUNTER', 'ONLINE', 'PHONE']).default('COUNTER'),
});
export type AppointmentCreate = z.infer<typeof AppointmentCreateSchema>;

export const AppointmentUpdateSchema = z.object({
  appointmentDate: z.coerce.date().optional(),
  slotTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/).optional(),
  status: AppointmentStatusEnum.optional(),
  chiefComplaint: z.string().max(500).optional(),
  notes: z.string().max(1000).optional(),
  cancellationReason: z.string().max(500).optional(),
});
export type AppointmentUpdate = z.infer<typeof AppointmentUpdateSchema>;

// ============================================================================
// PRESCRIPTION SCHEMAS
// ============================================================================

export const PrescriptionItemSchema = z.object({
  drugId: z.string().cuid('Invalid drug ID'),
  drugName: z.string().min(1, 'Drug name is required'),
  dosage: z.string().max(50).optional(),
  frequency: PrescriptionFrequencyEnum,
  frequencyCustom: z.string().max(100).optional(),
  route: DrugRouteEnum.default('ORAL'),
  duration: z.number().int().min(1, 'Duration must be at least 1 day').max(365),
  durationUnit: z.enum(['days', 'weeks', 'months']).default('days'),
  timing: z.array(z.string()).default([]),
  relation: z.string().max(50).optional(),
  quantity: z.number().int().min(1, 'Quantity must be at least 1'),
  quantityUnit: z.string().default('tablets'),
  instructions: z.string().max(500).optional(),
  displayOrder: z.number().int().default(0),
});
export type PrescriptionItem = z.infer<typeof PrescriptionItemSchema>;

export const PrescriptionCreateSchema = z.object({
  patientId: z.string().cuid('Invalid patient ID'),
  medicalRecordId: z.string().cuid('Invalid medical record ID'),
  items: z.array(PrescriptionItemSchema).min(1, 'At least one prescription item is required'),
  generalInstructions: z.string().max(1000).optional(),
  dietaryAdvice: z.string().max(1000).optional(),
  validTill: z.coerce.date().optional(),
});
export type PrescriptionCreate = z.infer<typeof PrescriptionCreateSchema>;

// ============================================================================
// INVENTORY & DISPENSE SCHEMAS
// ============================================================================

export const InventoryBatchCreateSchema = z.object({
  inventoryItemId: z.string().cuid('Invalid inventory item ID'),
  batchNumber: z.string().min(1, 'Batch number is required').max(50),
  expiryDate: z.coerce.date({
    required_error: 'Expiry date is required',
  }).refine((date) => date > new Date(), {
    message: 'Expiry date must be in the future',
  }),
  manufacturingDate: z.coerce.date().optional(),
  initialQty: z.number().int().min(1, 'Quantity must be at least 1'),
  purchasePrice: z.number().min(0, 'Purchase price cannot be negative'),
  sellingPrice: z.number().min(0, 'Selling price cannot be negative'),
  discountPercent: z.number().min(0).max(100).optional(),
  supplierId: z.string().optional(),
  supplierName: z.string().max(200).optional(),
  invoiceNo: z.string().max(50).optional(),
  invoiceDate: z.coerce.date().optional(),
});
export type InventoryBatchCreate = z.infer<typeof InventoryBatchCreateSchema>;

export const DispenseRequestSchema = z.object({
  drugId: z.string().cuid('Invalid drug ID'),
  quantity: z.number().int().min(1, 'Quantity must be at least 1'),
  hospitalId: z.string().cuid('Invalid hospital ID'),
});
export type DispenseRequest = z.infer<typeof DispenseRequestSchema>;

export interface DispenseResult {
  success: boolean;
  dispensedBatches: Array<{
    batchId: string;
    batchNumber: string;
    quantityDispensed: number;
    expiryDate: Date;
    unitPrice: number;
  }>;
  totalDispensed: number;
  remainingRequest: number;
  error?: string;
}

// ============================================================================
// INVOICE SCHEMAS
// ============================================================================

export const InvoiceItemSchema = z.object({
  serviceId: z.string().cuid().optional(),
  description: z.string().min(1, 'Description is required').max(500),
  category: z.string().max(50).optional(),
  quantity: z.number().int().min(1).default(1),
  unitPrice: z.number().min(0, 'Unit price cannot be negative'),
  discountPercent: z.number().min(0).max(100).optional(),
  taxPercent: z.number().min(0).max(100).optional(),
  displayOrder: z.number().int().default(0),
});
export type InvoiceItem = z.infer<typeof InvoiceItemSchema>;

export const InvoiceCreateSchema = z.object({
  patientId: z.string().cuid('Invalid patient ID'),
  appointmentId: z.string().cuid().optional(),
  items: z.array(InvoiceItemSchema).min(1, 'At least one item is required'),
  discountAmount: z.number().min(0).default(0),
  discountReason: z.string().max(200).optional(),
  notes: z.string().max(1000).optional(),
  dueDate: z.coerce.date().optional(),
});
export type InvoiceCreate = z.infer<typeof InvoiceCreateSchema>;

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
  };
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
}

// ============================================================================
// SOCKET EVENT TYPES
// ============================================================================

export interface QueueUpdateEvent {
  type: 'PATIENT_CHECK_IN' | 'DOCTOR_NEXT' | 'QUEUE_UPDATED' | 'PATIENT_SKIPPED';
  hospitalId: string;
  doctorId: string;
  queueDate: string; // ISO date string
  currentToken?: string;
  nextToken?: string;
  estimatedWait?: number; // minutes
  queueLength: number;
}

export interface TokenDisplayInfo {
  currentToken: string | null;
  nextToken: string | null;
  estimatedWaitMinutes: number;
  patientsWaiting: number;
  doctorName: string;
  departmentName: string;
}

// ============================================================================
// UHID GENERATION TYPES
// ============================================================================

export interface UHIDGenerationParams {
  hospitalCode: string; // e.g., "HOS"
  hospitalId: string;
}

export interface UHIDResult {
  uhid: string;           // e.g., "HOS-2601-0001"
  yearMonth: string;      // e.g., "2601"
  sequenceNumber: number; // e.g., 1
}

// ============================================================================
// DRUG INTERACTION TYPES
// ============================================================================

export interface DrugInteractionCheck {
  drugId: string;
  drugName: string;
  patientId: string;
}

export interface DrugInteractionResult {
  hasInteractions: boolean;
  alerts: Array<{
    level: AlertLevel;
    interactingDrugName: string;
    description: string;
    recommendation: string;
  }>;
  allergyAlerts: Array<{
    level: AlertLevel;
    allergen: string;
    description: string;
  }>;
}

// ============================================================================
// SLOT GENERATION TYPES
// ============================================================================

export interface DoctorScheduleSlot {
  time: string;        // "HH:mm" format
  endTime: string;     // "HH:mm" format
  isAvailable: boolean;
  isBooked: boolean;
  appointmentId?: string;
  patientName?: string;
}

export interface DailySlotSchedule {
  doctorId: string;
  date: string; // ISO date
  slots: DoctorScheduleSlot[];
  totalSlots: number;
  bookedSlots: number;
  availableSlots: number;
}
