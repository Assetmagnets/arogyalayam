
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Starting service seed...');

    // 1. Fetch Hospital
    const hospital = await prisma.hospital.findUnique({
        where: { code: 'HMS' }
    });

    if (!hospital) {
        throw new Error('Hospital HMS not found. Run full seed first.');
    }
    console.log(`Found hospital: ${hospital.name}`);

    // 2. Fetch Departments
    const departments = await prisma.department.findMany({
        where: { hospitalId: hospital.id }
    });

    const deptMap = new Map(departments.map(d => [d.code, d.id]));
    const getDeptId = (code: string) => deptMap.get(code) || departments[0].id; // Fallback to first if not found

    // 3. Services Data
    const services = [
        // CONSULTATION
        {
            code: 'CON-GEN',
            name: 'General Consultation',
            category: 'Consultation',
            departmentId: getDeptId('GEN'),
            baseRate: 500,
            taxPercent: 0,
            isActive: true,
        },
        {
            code: 'CON-SPEC',
            name: 'Specialist Consultation',
            category: 'Consultation',
            departmentId: getDeptId('CARD'), // Example
            baseRate: 800,
            taxPercent: 0,
            isActive: true,
        },
        // LAB
        {
            code: 'LAB-CBC',
            name: 'Complete Blood Count (CBC)',
            category: 'Lab',
            departmentId: getDeptId('GEN'),
            baseRate: 350,
            taxPercent: 0,
            isActive: true,
        },
        {
            code: 'LAB-LIPID',
            name: 'Lipid Profile',
            category: 'Lab',
            departmentId: getDeptId('GEN'),
            baseRate: 600,
            taxPercent: 0,
            isActive: true,
        },
        {
            code: 'LAB-XRAY',
            name: 'X-Ray Chest PA View',
            category: 'Lab',
            departmentId: getDeptId('ORTHO'),
            baseRate: 500,
            taxPercent: 0,
            isActive: true,
        },
        // PROCEDURES
        {
            code: 'PROC-DRESS',
            name: 'Wound Dressing - Small',
            category: 'Procedures',
            departmentId: getDeptId('GEN'),
            baseRate: 200,
            taxPercent: 0,
            isActive: true,
        },
        {
            code: 'PROC-INJ',
            name: 'Injection Administration (IM/IV)',
            category: 'Procedures',
            departmentId: getDeptId('GEN'),
            baseRate: 100,
            taxPercent: 0,
            isActive: true,
        },
        // PHARMACY
        {
            code: 'PH-PARA500',
            name: 'Paracetamol 500mg (Strip of 10)',
            category: 'Pharmacy',
            departmentId: getDeptId('GEN'),
            baseRate: 20,
            taxPercent: 12,
            isActive: true,
        },
        {
            code: 'PH-AMOX500',
            name: 'Amoxicillin 500mg (Strip of 10)',
            category: 'Pharmacy',
            departmentId: getDeptId('GEN'),
            baseRate: 85,
            taxPercent: 12,
            isActive: true,
        },
        {
            code: 'ROOM-GEN',
            name: 'General Ward Bed Charge (Per Day)',
            category: 'Room',
            departmentId: getDeptId('GEN'),
            baseRate: 1000,
            taxPercent: 0,
            isActive: true,
        },
    ];

    console.log('Upserting services...');
    for (const s of services) {
        await prisma.serviceMaster.upsert({
            where: { hospitalId_code: { hospitalId: hospital.id, code: s.code } },
            update: {}, // Don't overwrite if exists, just ensure it exists
            create: {
                hospitalId: hospital.id,
                ...s,
                createdBy: 'system',
                updatedBy: 'system',
            },
        });
    }
    console.log(`Finished creating ${services.length} services.`);
}

main()
    .catch((e) => {
        console.error('Seed failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
