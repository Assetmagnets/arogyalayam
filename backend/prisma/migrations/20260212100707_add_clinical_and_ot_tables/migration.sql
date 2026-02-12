/*
  Warnings:

  - A unique constraint covering the columns `[admissionId]` on the table `Invoice` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "LabOrder" DROP CONSTRAINT "LabOrder_medicalRecordId_fkey";

-- DropForeignKey
ALTER TABLE "MedicalRecord" DROP CONSTRAINT "MedicalRecord_appointmentId_fkey";

-- DropForeignKey
ALTER TABLE "Prescription" DROP CONSTRAINT "Prescription_medicalRecordId_fkey";

-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN     "admissionId" TEXT;

-- AlterTable
ALTER TABLE "LabOrder" ADD COLUMN     "admissionId" TEXT,
ALTER COLUMN "medicalRecordId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "MedicalRecord" ADD COLUMN     "admissionId" TEXT,
ALTER COLUMN "appointmentId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Prescription" ADD COLUMN     "admissionId" TEXT,
ALTER COLUMN "medicalRecordId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "OTRoom" (
    "id" TEXT NOT NULL,
    "hospitalId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "type" TEXT,
    "status" TEXT NOT NULL DEFAULT 'AVAILABLE',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "createdBy" TEXT NOT NULL,
    "updatedBy" TEXT NOT NULL,

    CONSTRAINT "OTRoom_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SurgeryBooking" (
    "id" TEXT NOT NULL,
    "hospitalId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "admissionId" TEXT,
    "doctorId" TEXT NOT NULL,
    "otRoomId" TEXT NOT NULL,
    "procedureName" TEXT NOT NULL,
    "surgeryDate" TIMESTAMP(3) NOT NULL,
    "startTime" TEXT,
    "endTime" TEXT,
    "durationMinutes" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
    "preOpNotes" TEXT,
    "postOpNotes" TEXT,
    "anesthesiaType" TEXT,
    "anesthetistName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT NOT NULL,
    "updatedBy" TEXT NOT NULL,

    CONSTRAINT "SurgeryBooking_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OTRoom_hospitalId_idx" ON "OTRoom"("hospitalId");

-- CreateIndex
CREATE INDEX "OTRoom_status_idx" ON "OTRoom"("status");

-- CreateIndex
CREATE UNIQUE INDEX "OTRoom_hospitalId_code_key" ON "OTRoom"("hospitalId", "code");

-- CreateIndex
CREATE INDEX "SurgeryBooking_patientId_idx" ON "SurgeryBooking"("patientId");

-- CreateIndex
CREATE INDEX "SurgeryBooking_admissionId_idx" ON "SurgeryBooking"("admissionId");

-- CreateIndex
CREATE INDEX "SurgeryBooking_otRoomId_idx" ON "SurgeryBooking"("otRoomId");

-- CreateIndex
CREATE INDEX "SurgeryBooking_surgeryDate_idx" ON "SurgeryBooking"("surgeryDate");

-- CreateIndex
CREATE INDEX "SurgeryBooking_status_idx" ON "SurgeryBooking"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_admissionId_key" ON "Invoice"("admissionId");

-- AddForeignKey
ALTER TABLE "MedicalRecord" ADD CONSTRAINT "MedicalRecord_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicalRecord" ADD CONSTRAINT "MedicalRecord_admissionId_fkey" FOREIGN KEY ("admissionId") REFERENCES "Admission"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Prescription" ADD CONSTRAINT "Prescription_medicalRecordId_fkey" FOREIGN KEY ("medicalRecordId") REFERENCES "MedicalRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Prescription" ADD CONSTRAINT "Prescription_admissionId_fkey" FOREIGN KEY ("admissionId") REFERENCES "Admission"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LabOrder" ADD CONSTRAINT "LabOrder_medicalRecordId_fkey" FOREIGN KEY ("medicalRecordId") REFERENCES "MedicalRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LabOrder" ADD CONSTRAINT "LabOrder_admissionId_fkey" FOREIGN KEY ("admissionId") REFERENCES "Admission"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_admissionId_fkey" FOREIGN KEY ("admissionId") REFERENCES "Admission"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OTRoom" ADD CONSTRAINT "OTRoom_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "Hospital"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SurgeryBooking" ADD CONSTRAINT "SurgeryBooking_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SurgeryBooking" ADD CONSTRAINT "SurgeryBooking_admissionId_fkey" FOREIGN KEY ("admissionId") REFERENCES "Admission"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SurgeryBooking" ADD CONSTRAINT "SurgeryBooking_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "Doctor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SurgeryBooking" ADD CONSTRAINT "SurgeryBooking_otRoomId_fkey" FOREIGN KEY ("otRoomId") REFERENCES "OTRoom"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
