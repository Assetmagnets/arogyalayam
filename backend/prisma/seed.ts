// ============================================================================
// HMS Backend - Database Seed Script
// Populates the database with initial data for development/testing
// ============================================================================

import { PrismaClient, UserStatus, Gender, BloodGroup, PatientType } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    console.log('Starting database seed...');

    // ========================================================================
    // 1. CREATE ROLES
    // ========================================================================
    console.log('Creating roles...');

    const roles = await Promise.all([
        prisma.role.upsert({
            where: { code: 'SUPER_ADMIN' },
            update: {},
            create: {
                name: 'Super Admin',
                code: 'SUPER_ADMIN',
                description: 'Full system access across all hospitals',
                isSystemRole: true,
                createdBy: 'system',
                updatedBy: 'system',
            },
        }),
        prisma.role.upsert({
            where: { code: 'HOSPITAL_ADMIN' },
            update: {},
            create: {
                name: 'Hospital Admin',
                code: 'HOSPITAL_ADMIN',
                description: 'Full access within a single hospital',
                isSystemRole: true,
                createdBy: 'system',
                updatedBy: 'system',
            },
        }),
        prisma.role.upsert({
            where: { code: 'DOCTOR' },
            update: {},
            create: {
                name: 'Doctor',
                code: 'DOCTOR',
                description: 'Clinical access - consultations, prescriptions',
                isSystemRole: true,
                createdBy: 'system',
                updatedBy: 'system',
            },
        }),
        prisma.role.upsert({
            where: { code: 'RECEPTIONIST' },
            update: {},
            create: {
                name: 'Receptionist',
                code: 'RECEPTIONIST',
                description: 'Front desk - patient registration, appointments',
                isSystemRole: true,
                createdBy: 'system',
                updatedBy: 'system',
            },
        }),
        prisma.role.upsert({
            where: { code: 'NURSE' },
            update: {},
            create: {
                name: 'Nurse',
                code: 'NURSE',
                description: 'Nursing staff - vitals, patient care',
                isSystemRole: true,
                createdBy: 'system',
                updatedBy: 'system',
            },
        }),
        prisma.role.upsert({
            where: { code: 'PHARMACIST' },
            update: {},
            create: {
                name: 'Pharmacist',
                code: 'PHARMACIST',
                description: 'Pharmacy operations - dispensing, inventory',
                isSystemRole: true,
                createdBy: 'system',
                updatedBy: 'system',
            },
        }),
        prisma.role.upsert({
            where: { code: 'LAB_TECH' },
            update: {},
            create: {
                name: 'Lab Technician',
                code: 'LAB_TECH',
                description: 'Laboratory operations - sample collection, results',
                isSystemRole: true,
                createdBy: 'system',
                updatedBy: 'system',
            },
        }),
        prisma.role.upsert({
            where: { code: 'BILLING_STAFF' },
            update: {},
            create: {
                name: 'Billing Staff',
                code: 'BILLING_STAFF',
                description: 'Billing operations - invoices, payments',
                isSystemRole: true,
                createdBy: 'system',
                updatedBy: 'system',
            },
        }),
    ]);

    const roleMap = new Map(roles.map((r) => [r.code, r]));
    console.log(`Created ${roles.length} roles`);

    // ========================================================================
    // 2. CREATE PERMISSIONS
    // ========================================================================
    console.log('Creating permissions...');

    const modules = ['patients', 'appointments', 'doctors', 'emr', 'prescriptions', 'pharmacy', 'lab', 'billing', 'users', 'reports', 'settings'];
    const actions = ['create', 'read', 'update', 'delete'];

    const permissions = [];
    for (const module of modules) {
        for (const action of actions) {
            const perm = await prisma.permission.upsert({
                where: { module_action: { module, action } },
                update: {},
                create: {
                    module,
                    action,
                    description: `${action.charAt(0).toUpperCase() + action.slice(1)} ${module}`,
                },
            });
            permissions.push(perm);
        }
    }
    console.log(`Created ${permissions.length} permissions`);

    // ========================================================================
    // 3. ASSIGN PERMISSIONS TO ROLES
    // ========================================================================
    console.log('Assigning permissions to roles...');

    // Super Admin gets all permissions
    const superAdminRole = roleMap.get('SUPER_ADMIN')!;
    for (const perm of permissions) {
        await prisma.rolePermission.upsert({
            where: { roleId_permissionId: { roleId: superAdminRole.id, permissionId: perm.id } },
            update: {},
            create: { roleId: superAdminRole.id, permissionId: perm.id },
        });
    }

    // Hospital Admin gets all permissions (like Super Admin)
    const hospitalAdminRole = roleMap.get('HOSPITAL_ADMIN')!;
    for (const perm of permissions) {
        await prisma.rolePermission.upsert({
            where: { roleId_permissionId: { roleId: hospitalAdminRole.id, permissionId: perm.id } },
            update: {},
            create: { roleId: hospitalAdminRole.id, permissionId: perm.id },
        });
    }

    // Receptionist: patients, appointments
    const receptionistRole = roleMap.get('RECEPTIONIST')!;
    const receptionistModules = ['patients', 'appointments', 'doctors'];
    for (const perm of permissions.filter((p) => receptionistModules.includes(p.module))) {
        await prisma.rolePermission.upsert({
            where: { roleId_permissionId: { roleId: receptionistRole.id, permissionId: perm.id } },
            update: {},
            create: { roleId: receptionistRole.id, permissionId: perm.id },
        });
    }

    // Doctor: patients (read), appointments, emr, prescriptions
    const doctorRole = roleMap.get('DOCTOR')!;
    const doctorPerms = permissions.filter(
        (p) =>
            (p.module === 'patients' && p.action === 'read') ||
            p.module === 'appointments' ||
            p.module === 'emr' ||
            p.module === 'prescriptions'
    );
    for (const perm of doctorPerms) {
        await prisma.rolePermission.upsert({
            where: { roleId_permissionId: { roleId: doctorRole.id, permissionId: perm.id } },
            update: {},
            create: { roleId: doctorRole.id, permissionId: perm.id },
        });
    }

    console.log('Assigned permissions to roles');

    // ========================================================================
    // 4. CREATE HOSPITAL
    // ========================================================================
    console.log('Creating hospital...');

    const hospital = await prisma.hospital.upsert({
        where: { code: 'HMS' },
        update: {},
        create: {
            name: 'HMS Multi-Specialty Hospital',
            code: 'HMS',
            registrationNo: 'REG-2024-HMS-001',
            email: 'info@hms-hospital.com',
            phone: '+91-9876543210',
            addressLine1: '123, Healthcare Avenue',
            city: 'New Delhi',
            district: 'New Delhi',
            state: 'Delhi',
            pinCode: '110001',
            country: 'India',
            gstNumber: '07AAACH7409R1ZZ',
            createdBy: 'system',
            updatedBy: 'system',
        },
    });
    console.log(`Created hospital: ${hospital.name}`);

    // ========================================================================
    // 5. CREATE DEPARTMENTS
    // ========================================================================
    console.log('Creating departments...');

    const departments = await Promise.all([
        prisma.department.upsert({
            where: { hospitalId_code: { hospitalId: hospital.id, code: 'GEN' } },
            update: {},
            create: {
                hospitalId: hospital.id,
                name: 'General Medicine',
                code: 'GEN',
                description: 'General medical consultations',
                displayOrder: 1,
                createdBy: 'system',
                updatedBy: 'system',
            },
        }),
        prisma.department.upsert({
            where: { hospitalId_code: { hospitalId: hospital.id, code: 'CARD' } },
            update: {},
            create: {
                hospitalId: hospital.id,
                name: 'Cardiology',
                code: 'CARD',
                description: 'Heart and cardiovascular diseases',
                displayOrder: 2,
                createdBy: 'system',
                updatedBy: 'system',
            },
        }),
        prisma.department.upsert({
            where: { hospitalId_code: { hospitalId: hospital.id, code: 'ORTHO' } },
            update: {},
            create: {
                hospitalId: hospital.id,
                name: 'Orthopedics',
                code: 'ORTHO',
                description: 'Bone and joint disorders',
                displayOrder: 3,
                createdBy: 'system',
                updatedBy: 'system',
            },
        }),
        prisma.department.upsert({
            where: { hospitalId_code: { hospitalId: hospital.id, code: 'PEDIA' } },
            update: {},
            create: {
                hospitalId: hospital.id,
                name: 'Pediatrics',
                code: 'PEDIA',
                description: 'Child healthcare',
                displayOrder: 4,
                createdBy: 'system',
                updatedBy: 'system',
            },
        }),
    ]);
    console.log(`Created ${departments.length} departments`);

    // ========================================================================
    // 6. CREATE ADMIN USER
    // ========================================================================
    console.log('Creating admin user...');

    const adminPasswordHash = await bcrypt.hash('Admin@123', 12);

    const adminUser = await prisma.user.upsert({
        where: { email: 'admin@hms-hospital.com' },
        update: {},
        create: {
            hospitalId: hospital.id,
            email: 'admin@hms-hospital.com',
            passwordHash: adminPasswordHash,
            firstName: 'System',
            lastName: 'Admin',
            phone: '9876543210',
            status: UserStatus.ACTIVE,
            emailVerifiedAt: new Date(),
            roleId: superAdminRole.id,
            createdBy: 'system',
            updatedBy: 'system',
        },
    });
    console.log(`Created admin user: ${adminUser.email}`);

    // ========================================================================
    // 7. CREATE SAMPLE DOCTOR
    // ========================================================================
    console.log('Creating sample doctor...');

    const doctorPasswordHash = await bcrypt.hash('Doctor@123', 12);

    const doctorUser = await prisma.user.upsert({
        where: { email: 'dr.sharma@hms-hospital.com' },
        update: {},
        create: {
            hospitalId: hospital.id,
            email: 'dr.sharma@hms-hospital.com',
            passwordHash: doctorPasswordHash,
            firstName: 'Rajesh',
            lastName: 'Sharma',
            phone: '9876543211',
            status: UserStatus.ACTIVE,
            emailVerifiedAt: new Date(),
            roleId: doctorRole.id,
            createdBy: 'system',
            updatedBy: 'system',
        },
    });

    const doctor = await prisma.doctor.upsert({
        where: { userId: doctorUser.id },
        update: {},
        create: {
            hospitalId: hospital.id,
            userId: doctorUser.id,
            registrationNo: 'DMC-2020-12345',
            qualification: ['MBBS', 'MD (General Medicine)'],
            specialization: 'General Medicine',
            experience: 15,
            departmentId: departments[0].id, // General Medicine
            consultationFee: 500,
            followUpFee: 300,
            avgConsultationTime: 15,
            isActive: true,
            createdBy: 'system',
            updatedBy: 'system',
        },
    });

    // Create doctor schedule (Mon-Sat, 9 AM - 1 PM and 4 PM - 7 PM)
    for (let day = 1; day <= 6; day++) {
        await prisma.doctorSchedule.upsert({
            where: {
                doctorId_dayOfWeek_startTime: {
                    doctorId: doctor.id,
                    dayOfWeek: day,
                    startTime: '09:00',
                },
            },
            update: {},
            create: {
                doctorId: doctor.id,
                dayOfWeek: day,
                startTime: '09:00',
                endTime: '13:00',
                slotDuration: 15,
                bufferTime: 5,
                maxPatients: 16,
            },
        });
        await prisma.doctorSchedule.upsert({
            where: {
                doctorId_dayOfWeek_startTime: {
                    doctorId: doctor.id,
                    dayOfWeek: day,
                    startTime: '16:00',
                },
            },
            update: {},
            create: {
                doctorId: doctor.id,
                dayOfWeek: day,
                startTime: '16:00',
                endTime: '19:00',
                slotDuration: 15,
                bufferTime: 5,
                maxPatients: 12,
            },
        });
    }
    console.log(`Created doctor: Dr. ${doctorUser.firstName} ${doctorUser.lastName}`);

    // ========================================================================
    // 8. CREATE SAMPLE PATIENT
    // ========================================================================
    console.log('Creating sample patient...');

    // Get UHID sequence
    const now = new Date();
    const yearMonth = `${now.getFullYear().toString().slice(-2)}${(now.getMonth() + 1).toString().padStart(2, '0')}`;

    const sequence = await prisma.uhidSequence.upsert({
        where: {
            hospitalId_yearMonth: {
                hospitalId: hospital.id,
                yearMonth,
            },
        },
        update: { lastSeq: { increment: 1 } },
        create: {
            hospitalId: hospital.id,
            yearMonth,
            lastSeq: 1,
        },
    });

    const uhid = `${hospital.code}-${yearMonth}-${sequence.lastSeq.toString().padStart(4, '0')}`;

    const patient = await prisma.patient.upsert({
        where: { uhid },
        update: {},
        create: {
            hospitalId: hospital.id,
            uhid,
            firstName: 'Amit',
            lastName: 'Patel',
            gender: Gender.MALE,
            dateOfBirth: new Date('1985-03-15'),
            bloodGroup: BloodGroup.B_POSITIVE,
            mobilePrimary: '9876543212',
            email: 'amit.patel@email.com',
            city: 'New Delhi',
            district: 'New Delhi',
            state: 'Delhi',
            pinCode: '110001',
            patientType: PatientType.CASH,
            allergies: ['Penicillin'],
            chronicConditions: ['Hypertension'],
            createdBy: 'system',
            updatedBy: 'system',
        },
    });
    console.log(`Created patient: ${patient.firstName} ${patient.lastName} (${patient.uhid})`);

    // ========================================================================
    // 9. CREATE RECEPTIONIST USER
    // ========================================================================
    console.log('Creating receptionist user...');

    const receptionistPasswordHash = await bcrypt.hash('Reception@123', 12);

    const receptionistUser = await prisma.user.upsert({
        where: { email: 'reception@hms-hospital.com' },
        update: {},
        create: {
            hospitalId: hospital.id,
            email: 'reception@hms-hospital.com',
            passwordHash: receptionistPasswordHash,
            firstName: 'Priya',
            lastName: 'Singh',
            phone: '9876543213',
            status: UserStatus.ACTIVE,
            emailVerifiedAt: new Date(),
            roleId: receptionistRole.id,
            createdBy: 'system',
            updatedBy: 'system',
        },
    });
    console.log(`Created receptionist: ${receptionistUser.firstName} ${receptionistUser.lastName}`);

    // ========================================================================
    // 10. CREATE SERVICE MASTER DATA
    // ========================================================================
    console.log('Creating service master data...');

    const services = [
        // CONSULTATION
        {
            code: 'CON-GEN',
            name: 'General Consultation',
            category: 'Consultation',
            departmentId: departments[0].id,
            baseRate: 500,
            taxPercent: 0,
            isActive: true,
        },
        {
            code: 'CON-SPEC',
            name: 'Specialist Consultation',
            category: 'Consultation',
            departmentId: departments[1].id,
            baseRate: 800,
            taxPercent: 0,
            isActive: true,
        },
        // LAB
        {
            code: 'LAB-CBC',
            name: 'Complete Blood Count (CBC)',
            category: 'Lab',
            departmentId: departments[0].id,
            baseRate: 350,
            taxPercent: 0,
            isActive: true,
        },
        {
            code: 'LAB-LIPID',
            name: 'Lipid Profile',
            category: 'Lab',
            departmentId: departments[0].id,
            baseRate: 600,
            taxPercent: 0,
            isActive: true,
        },
        {
            code: 'LAB-XRAY',
            name: 'X-Ray Chest PA View',
            category: 'Lab',
            departmentId: departments[2].id,
            baseRate: 500,
            taxPercent: 0,
            isActive: true,
        },
        // PROCEDURES
        {
            code: 'PROC-DRESS',
            name: 'Wound Dressing - Small',
            category: 'Procedures',
            departmentId: departments[0].id,
            baseRate: 200,
            taxPercent: 0,
            isActive: true,
        },
        {
            code: 'PROC-INJ',
            name: 'Injection Administration (IM/IV)',
            category: 'Procedures',
            departmentId: departments[0].id,
            baseRate: 100,
            taxPercent: 0,
            isActive: true,
        },
        // PHARMACY (Mapped as Services for direct billing if not linked to Inventory)
        {
            code: 'PH-PARA500',
            name: 'Paracetamol 500mg (Strip of 10)',
            category: 'Pharmacy',
            departmentId: departments[0].id,
            baseRate: 20,
            taxPercent: 12, // GST
            isActive: true,
        },
        {
            code: 'PH-AMOX500',
            name: 'Amoxicillin 500mg (Strip of 10)',
            category: 'Pharmacy',
            departmentId: departments[0].id,
            baseRate: 85,
            taxPercent: 12,
            isActive: true,
        },
        {
            code: 'ROOM-GEN',
            name: 'General Ward Bed Charge (Per Day)',
            category: 'Room',
            departmentId: departments[0].id,
            baseRate: 1000,
            taxPercent: 0,
            isActive: true,
        },
        {
            code: 'ROOM-PVT',
            name: 'Private Room Charge (Per Day)',
            category: 'Room',
            departmentId: departments[0].id,
            baseRate: 2500,
            taxPercent: 0,
            isActive: true,
        },
    ];

    for (const s of services) {
        await prisma.serviceMaster.upsert({
            where: { hospitalId_code: { hospitalId: hospital.id, code: s.code } },
            update: {},
            create: {
                hospitalId: hospital.id,
                ...s,
                createdBy: 'system',
                updatedBy: 'system',
            },
        });
    }
    console.log(`Created ${services.length} services`);

    // ========================================================================
    // SUMMARY
    // ========================================================================
    console.log('\n' + '='.repeat(60));
    console.log('Database seeding completed successfully!');
    console.log('='.repeat(60));
    console.log('\nCreated resources:');
    console.log(`   - Hospital: ${hospital.name} (Code: ${hospital.code})`);
    console.log(`   - Roles: ${roles.length}`);
    console.log(`   - Permissions: ${permissions.length}`);
    console.log(`   - Departments: ${departments.length}`);
    console.log(`   - Services: ${services.length}`);
    console.log('\nLogin credentials:');
    console.log('   Admin:');
    console.log('      Email: admin@hms-hospital.com');
    console.log('      Password: Admin@123');
    console.log('   Doctor:');
    console.log('      Email: dr.sharma@hms-hospital.com');
    console.log('      Password: Doctor@123');
    console.log('   Receptionist:');
    console.log('      Email: reception@hms-hospital.com');
    console.log('      Password: Reception@123');
    console.log('');
}

main()
    .catch((e) => {
        console.error('Seed failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
