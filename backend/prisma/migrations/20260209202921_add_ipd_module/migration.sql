-- CreateEnum
CREATE TYPE "AdmissionStatus" AS ENUM ('ADMITTED', 'TRANSFERRED', 'DISCHARGED', 'EXPIRED', 'LAMA');

-- CreateEnum
CREATE TYPE "BedStatus" AS ENUM ('AVAILABLE', 'OCCUPIED', 'MAINTENANCE', 'RESERVED');

-- CreateEnum
CREATE TYPE "WardType" AS ENUM ('GENERAL', 'SEMI_PRIVATE', 'PRIVATE', 'ICU', 'NICU', 'PICU', 'CCU', 'ISOLATION', 'EMERGENCY');

-- CreateTable
CREATE TABLE "Ward" (
    "id" TEXT NOT NULL,
    "hospitalId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "type" "WardType" NOT NULL DEFAULT 'GENERAL',
    "floor" TEXT,
    "building" TEXT,
    "totalBeds" INTEGER NOT NULL DEFAULT 0,
    "dailyRate" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "nursingStation" TEXT,
    "inCharge" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "createdBy" TEXT NOT NULL,
    "updatedBy" TEXT NOT NULL,

    CONSTRAINT "Ward_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Bed" (
    "id" TEXT NOT NULL,
    "wardId" TEXT NOT NULL,
    "bedNumber" TEXT NOT NULL,
    "bedType" TEXT NOT NULL DEFAULT 'Regular',
    "status" "BedStatus" NOT NULL DEFAULT 'AVAILABLE',
    "dailyRate" DECIMAL(10,2),
    "hasOxygen" BOOLEAN NOT NULL DEFAULT false,
    "hasMonitor" BOOLEAN NOT NULL DEFAULT false,
    "hasVentilator" BOOLEAN NOT NULL DEFAULT false,
    "floor" TEXT,
    "wing" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "createdBy" TEXT NOT NULL,
    "updatedBy" TEXT NOT NULL,

    CONSTRAINT "Bed_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Admission" (
    "id" TEXT NOT NULL,
    "hospitalId" TEXT NOT NULL,
    "admissionNo" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "admittingDoctorId" TEXT NOT NULL,
    "attendingDoctorId" TEXT,
    "bedId" TEXT NOT NULL,
    "admissionDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "admissionType" TEXT NOT NULL DEFAULT 'ELECTIVE',
    "admissionReason" TEXT NOT NULL,
    "chiefComplaint" TEXT,
    "provisionalDiagnosis" TEXT,
    "status" "AdmissionStatus" NOT NULL DEFAULT 'ADMITTED',
    "expectedStayDays" INTEGER,
    "expectedDischarge" TIMESTAMP(3),
    "dischargeDate" TIMESTAMP(3),
    "dischargeType" TEXT,
    "dischargeSummary" TEXT,
    "dischargeAdvice" TEXT,
    "followUpDate" TIMESTAMP(3),
    "isInsured" BOOLEAN NOT NULL DEFAULT false,
    "insuranceApprovalNo" TEXT,
    "insuranceApprovedAmount" DECIMAL(12,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "createdBy" TEXT NOT NULL,
    "updatedBy" TEXT NOT NULL,

    CONSTRAINT "Admission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NursingNote" (
    "id" TEXT NOT NULL,
    "admissionId" TEXT NOT NULL,
    "noteType" TEXT NOT NULL DEFAULT 'ROUTINE',
    "shift" TEXT,
    "content" TEXT NOT NULL,
    "temperature" DECIMAL(4,1),
    "bpSystolic" INTEGER,
    "bpDiastolic" INTEGER,
    "pulseRate" INTEGER,
    "respiratoryRate" INTEGER,
    "spO2" INTEGER,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "recordedBy" TEXT NOT NULL,
    "recordedByName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NursingNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DoctorRound" (
    "id" TEXT NOT NULL,
    "admissionId" TEXT NOT NULL,
    "doctorId" TEXT NOT NULL,
    "roundDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "roundType" TEXT NOT NULL DEFAULT 'ROUTINE',
    "clinicalNotes" TEXT,
    "assessment" TEXT,
    "plan" TEXT,
    "orders" TEXT,
    "reviewStatus" TEXT,
    "escalationNeeded" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT NOT NULL,
    "updatedBy" TEXT NOT NULL,

    CONSTRAINT "DoctorRound_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BedTransfer" (
    "id" TEXT NOT NULL,
    "admissionId" TEXT NOT NULL,
    "fromBedId" TEXT NOT NULL,
    "toBedId" TEXT NOT NULL,
    "transferDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reason" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL,

    CONSTRAINT "BedTransfer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdmissionSequence" (
    "id" TEXT NOT NULL,
    "hospitalId" TEXT NOT NULL,
    "yearMonth" TEXT NOT NULL,
    "lastSeq" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "AdmissionSequence_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Ward_hospitalId_idx" ON "Ward"("hospitalId");

-- CreateIndex
CREATE INDEX "Ward_type_idx" ON "Ward"("type");

-- CreateIndex
CREATE INDEX "Ward_isActive_idx" ON "Ward"("isActive");

-- CreateIndex
CREATE INDEX "Ward_deletedAt_idx" ON "Ward"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Ward_hospitalId_code_key" ON "Ward"("hospitalId", "code");

-- CreateIndex
CREATE INDEX "Bed_wardId_idx" ON "Bed"("wardId");

-- CreateIndex
CREATE INDEX "Bed_status_idx" ON "Bed"("status");

-- CreateIndex
CREATE INDEX "Bed_isActive_idx" ON "Bed"("isActive");

-- CreateIndex
CREATE INDEX "Bed_deletedAt_idx" ON "Bed"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Bed_wardId_bedNumber_key" ON "Bed"("wardId", "bedNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Admission_admissionNo_key" ON "Admission"("admissionNo");

-- CreateIndex
CREATE INDEX "Admission_hospitalId_idx" ON "Admission"("hospitalId");

-- CreateIndex
CREATE INDEX "Admission_patientId_idx" ON "Admission"("patientId");

-- CreateIndex
CREATE INDEX "Admission_admittingDoctorId_idx" ON "Admission"("admittingDoctorId");

-- CreateIndex
CREATE INDEX "Admission_bedId_idx" ON "Admission"("bedId");

-- CreateIndex
CREATE INDEX "Admission_status_idx" ON "Admission"("status");

-- CreateIndex
CREATE INDEX "Admission_admissionDate_idx" ON "Admission"("admissionDate");

-- CreateIndex
CREATE INDEX "Admission_deletedAt_idx" ON "Admission"("deletedAt");

-- CreateIndex
CREATE INDEX "NursingNote_admissionId_idx" ON "NursingNote"("admissionId");

-- CreateIndex
CREATE INDEX "NursingNote_noteType_idx" ON "NursingNote"("noteType");

-- CreateIndex
CREATE INDEX "NursingNote_recordedAt_idx" ON "NursingNote"("recordedAt");

-- CreateIndex
CREATE INDEX "DoctorRound_admissionId_idx" ON "DoctorRound"("admissionId");

-- CreateIndex
CREATE INDEX "DoctorRound_doctorId_idx" ON "DoctorRound"("doctorId");

-- CreateIndex
CREATE INDEX "DoctorRound_roundDate_idx" ON "DoctorRound"("roundDate");

-- CreateIndex
CREATE INDEX "BedTransfer_admissionId_idx" ON "BedTransfer"("admissionId");

-- CreateIndex
CREATE INDEX "BedTransfer_fromBedId_idx" ON "BedTransfer"("fromBedId");

-- CreateIndex
CREATE INDEX "BedTransfer_toBedId_idx" ON "BedTransfer"("toBedId");

-- CreateIndex
CREATE INDEX "BedTransfer_transferDate_idx" ON "BedTransfer"("transferDate");

-- CreateIndex
CREATE INDEX "AdmissionSequence_hospitalId_idx" ON "AdmissionSequence"("hospitalId");

-- CreateIndex
CREATE UNIQUE INDEX "AdmissionSequence_hospitalId_yearMonth_key" ON "AdmissionSequence"("hospitalId", "yearMonth");

-- AddForeignKey
ALTER TABLE "Ward" ADD CONSTRAINT "Ward_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "Hospital"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bed" ADD CONSTRAINT "Bed_wardId_fkey" FOREIGN KEY ("wardId") REFERENCES "Ward"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Admission" ADD CONSTRAINT "Admission_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "Hospital"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Admission" ADD CONSTRAINT "Admission_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Admission" ADD CONSTRAINT "Admission_admittingDoctorId_fkey" FOREIGN KEY ("admittingDoctorId") REFERENCES "Doctor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Admission" ADD CONSTRAINT "Admission_attendingDoctorId_fkey" FOREIGN KEY ("attendingDoctorId") REFERENCES "Doctor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Admission" ADD CONSTRAINT "Admission_bedId_fkey" FOREIGN KEY ("bedId") REFERENCES "Bed"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NursingNote" ADD CONSTRAINT "NursingNote_admissionId_fkey" FOREIGN KEY ("admissionId") REFERENCES "Admission"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DoctorRound" ADD CONSTRAINT "DoctorRound_admissionId_fkey" FOREIGN KEY ("admissionId") REFERENCES "Admission"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DoctorRound" ADD CONSTRAINT "DoctorRound_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "Doctor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BedTransfer" ADD CONSTRAINT "BedTransfer_admissionId_fkey" FOREIGN KEY ("admissionId") REFERENCES "Admission"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BedTransfer" ADD CONSTRAINT "BedTransfer_fromBedId_fkey" FOREIGN KEY ("fromBedId") REFERENCES "Bed"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BedTransfer" ADD CONSTRAINT "BedTransfer_toBedId_fkey" FOREIGN KEY ("toBedId") REFERENCES "Bed"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
