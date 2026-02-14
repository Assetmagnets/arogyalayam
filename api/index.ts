import type { VercelRequest, VercelResponse } from '@vercel/node';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';

// ============================================================================
// PRISMA CLIENT (Singleton for serverless)
// ============================================================================

declare global {
    var prisma: PrismaClient | undefined;
}

const prisma = global.prisma || new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
    global.prisma = prisma;
}

// ============================================================================
// AUTH CONFIG
// ============================================================================

const JWT_SECRET = process.env.JWT_SECRET || 'hms-dev-secret-change-in-production';
const JWT_EXPIRES_IN = '24h';

// ============================================================================
// AVAILABLE MODULES (matches backend settings.routes.ts)
// ============================================================================

const AVAILABLE_MODULES = [
    { code: 'dashboard', name: 'Dashboard', description: 'Main dashboard overview', icon: 'LayoutDashboard' },
    { code: 'patients', name: 'Patients', description: 'Patient registration and management', icon: 'Users' },
    { code: 'appointments', name: 'Appointments', description: 'Appointment scheduling', icon: 'Calendar' },
    { code: 'opd', name: 'OPD', description: 'Outpatient department & queue management', icon: 'Stethoscope' },
    { code: 'ipd', name: 'IPD', description: 'Inpatient department management', icon: 'Bed' },
    { code: 'lab', name: 'Laboratory', description: 'Lab tests & results', icon: 'TestTube2' },
    { code: 'emr', name: 'EMR', description: 'Electronic Medical Records', icon: 'FileText' },
    { code: 'billing', name: 'Billing', description: 'Billing & invoicing', icon: 'Receipt' },
    { code: 'pharmacy', name: 'Pharmacy', description: 'Pharmacy & inventory', icon: 'Pill' },
    { code: 'reports', name: 'Reports', description: 'Reports & analytics', icon: 'BarChart3' },
    { code: 'settings', name: 'Settings', description: 'System settings', icon: 'Settings' },
    { code: 'users', name: 'Users', description: 'User management', icon: 'UserCog' },
];

const DEFAULT_ENABLED_MODULES = ['dashboard', 'patients', 'appointments', 'opd', 'settings', 'users'];

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const LoginSchema = z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(1, 'Password is required'),
});

// ============================================================================
// CORS HEADERS
// ============================================================================

function setCorsHeaders(res: VercelResponse) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

// ============================================================================
// AUTH MIDDLEWARE
// ============================================================================

interface JWTPayload {
    userId: string;
    email: string;
    hospitalId: string;
}

function verifyToken(req: VercelRequest): JWTPayload | null {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader?.startsWith('Bearer ')) {
            return null;
        }
        const token = authHeader.substring(7);
        return jwt.verify(token, JWT_SECRET) as JWTPayload;
    } catch {
        return null;
    }
}

function requireAuth(req: VercelRequest, res: VercelResponse): JWTPayload | null {
    const user = verifyToken(req);
    if (!user) {
        res.status(401).json({
            success: false,
            error: { code: 'UNAUTHORIZED', message: 'Invalid or missing token' }
        });
        return null;
    }
    return user;
}

// ============================================================================
// HELPER: Parse path params from URL patterns like /api/v1/opd/call-next/:id
// ============================================================================

function matchPath(path: string, pattern: string): Record<string, string> | null {
    // Normalize both paths
    const cleanPath = path.replace(/\/+$/, '');
    const cleanPattern = pattern.replace(/\/+$/, '');

    const pathParts = cleanPath.split('/');
    const patternParts = cleanPattern.split('/');

    if (pathParts.length !== patternParts.length) return null;

    const params: Record<string, string> = {};
    for (let i = 0; i < patternParts.length; i++) {
        if (patternParts[i].startsWith(':')) {
            params[patternParts[i].slice(1)] = pathParts[i];
        } else if (patternParts[i] !== pathParts[i]) {
            return null;
        }
    }
    return params;
}

// ============================================================================
// ROUTE HANDLERS - AUTH
// ============================================================================

async function handleHealth(res: VercelResponse) {
    try {
        await prisma.$queryRaw`SELECT 1`;
        return res.status(200).json({
            success: true,
            data: {
                status: 'healthy',
                database: 'connected',
                timestamp: new Date().toISOString(),
                hasDbUrl: !!process.env.DATABASE_URL,
                hasJwtSecret: !!process.env.JWT_SECRET,
            },
        });
    } catch {
        return res.status(503).json({
            success: false,
            data: {
                status: 'unhealthy',
                database: 'disconnected',
                timestamp: new Date().toISOString(),
            },
        });
    }
}

async function handleLogin(req: VercelRequest, res: VercelResponse) {
    try {
        const validation = LoginSchema.safeParse(req.body);
        if (!validation.success) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'VALIDATION_ERROR',
                    message: 'Invalid request data',
                    details: validation.error.flatten(),
                },
            });
        }

        const { email, password } = validation.data;

        const user = await prisma.user.findUnique({
            where: { email },
            include: {
                role: {
                    include: {
                        permissions: {
                            include: { permission: true }
                        }
                    }
                }
            }
        });

        if (!user) {
            return res.status(401).json({
                success: false,
                error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' }
            });
        }

        const isValid = await bcrypt.compare(password, user.passwordHash);
        if (!isValid) {
            return res.status(401).json({
                success: false,
                error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' }
            });
        }

        if (user.status !== 'ACTIVE') {
            return res.status(403).json({
                success: false,
                error: { code: 'ACCOUNT_INACTIVE', message: 'Account is not active' }
            });
        }

        const token = jwt.sign(
            {
                userId: user.id,
                email: user.email,
                hospitalId: user.hospitalId,
            },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRES_IN }
        );

        await prisma.user.update({
            where: { id: user.id },
            data: { lastLoginAt: new Date() }
        });

        const permissions = user.role.permissions.map((rp: any) => rp.permission.name);

        return res.status(200).json({
            success: true,
            data: {
                accessToken: token,
                refreshToken: token,
                user: {
                    id: user.id,
                    email: user.email,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    hospitalId: user.hospitalId,
                    role: user.role.name,
                    roleCode: user.role.code || user.role.name,
                    permissions,
                },
            },
        });
    } catch (error) {
        console.error('Login error:', error);
        return res.status(500).json({
            success: false,
            error: { code: 'INTERNAL_ERROR', message: 'An error occurred' }
        });
    }
}

async function handleGetMe(req: VercelRequest, res: VercelResponse) {
    const user = requireAuth(req, res);
    if (!user) return;

    try {
        const dbUser = await prisma.user.findUnique({
            where: { id: user.userId },
            include: {
                role: {
                    include: {
                        permissions: {
                            include: { permission: true }
                        }
                    }
                }
            }
        });

        if (!dbUser) {
            return res.status(404).json({
                success: false,
                error: { code: 'USER_NOT_FOUND', message: 'User not found' }
            });
        }

        const permissions = dbUser.role.permissions.map((rp: any) => rp.permission.name);

        return res.status(200).json({
            success: true,
            data: {
                id: dbUser.id,
                email: dbUser.email,
                firstName: dbUser.firstName,
                lastName: dbUser.lastName,
                hospitalId: dbUser.hospitalId,
                role: dbUser.role.name,
                roleCode: dbUser.role.code || dbUser.role.name,
                permissions,
                status: dbUser.status,
                lastLoginAt: dbUser.lastLoginAt,
            },
        });
    } catch (error) {
        console.error('Get user error:', error);
        return res.status(500).json({
            success: false,
            error: { code: 'INTERNAL_ERROR', message: 'An error occurred' }
        });
    }
}

// ============================================================================
// ROUTE HANDLERS - PATIENTS
// ============================================================================

async function handleGetPatients(req: VercelRequest, res: VercelResponse) {
    const user = requireAuth(req, res);
    if (!user) return;

    try {
        const { search, page = '1', limit = '10' } = req.query as Record<string, string>;
        const take = Math.min(parseInt(limit) || 10, 100);
        const skip = (Math.max(parseInt(page) || 1, 1) - 1) * take;

        const where: any = {
            hospitalId: user.hospitalId,
            deletedAt: null,
        };

        if (search) {
            where.OR = [
                { firstName: { contains: search, mode: 'insensitive' } },
                { lastName: { contains: search, mode: 'insensitive' } },
                { uhid: { contains: search, mode: 'insensitive' } },
                { mobilePrimary: { contains: search } },
            ];
        }

        const [patients, total] = await Promise.all([
            prisma.patient.findMany({
                where,
                take,
                skip,
                orderBy: { createdAt: 'desc' }
            }),
            prisma.patient.count({ where }),
        ]);

        return res.status(200).json({
            success: true,
            data: patients,
            meta: { total, page: parseInt(page) || 1, limit: take, totalPages: Math.ceil(total / take) }
        });
    } catch (error) {
        console.error('Get patients error:', error);
        return res.status(500).json({
            success: false,
            error: { code: 'INTERNAL_ERROR', message: 'An error occurred' }
        });
    }
}

async function handleCreatePatient(req: VercelRequest, res: VercelResponse) {
    const user = requireAuth(req, res);
    if (!user) return;

    try {
        const data = req.body;

        // Generate UHID
        const yearMonth = new Date().toISOString().slice(2, 4) + new Date().toISOString().slice(5, 7);
        let seq: any;
        try {
            seq = await prisma.uhidSequence.upsert({
                where: {
                    hospitalId_yearMonth: {
                        hospitalId: user.hospitalId,
                        yearMonth,
                    }
                },
                update: { lastSeq: { increment: 1 } },
                create: {
                    hospitalId: user.hospitalId,
                    yearMonth,
                    lastSeq: 1,
                },
            });
        } catch {
            seq = { lastSeq: Math.floor(Math.random() * 9000) + 1000 };
        }

        const uhid = `HMS-${yearMonth}-${String(seq.lastSeq).padStart(4, '0')}`;

        const patient = await prisma.patient.create({
            data: {
                hospitalId: user.hospitalId,
                uhid,
                firstName: data.firstName,
                lastName: data.lastName,
                gender: data.gender,
                dateOfBirth: new Date(data.dateOfBirth),
                bloodGroup: data.bloodGroup || undefined,
                mobilePrimary: data.mobilePrimary,
                mobileSecondary: data.mobileSecondary || undefined,
                email: data.email || undefined,
                emergencyContact: data.emergencyContact || undefined,
                emergencyContactName: data.emergencyContactName || undefined,
                emergencyRelation: data.emergencyRelation || undefined,
                city: data.city || '',
                district: data.district || '',
                state: data.state || '',
                pinCode: data.pinCode || '',
                houseNo: data.houseNo || undefined,
                street: data.street || undefined,
                area: data.area || undefined,
                aadhaarNumber: data.aadhaarNumber || undefined,
                abhaId: data.abhaId || undefined,
                patientType: data.patientType || 'CASH',
                allergies: data.allergies || [],
                chronicConditions: data.chronicConditions || [],
                createdBy: user.userId,
                updatedBy: user.userId,
            },
        });

        return res.status(201).json({
            success: true,
            data: { id: patient.id, uhid: patient.uhid },
            message: `Patient registered successfully. UHID: ${uhid}`,
        });
    } catch (error: any) {
        console.error('Create patient error:', error);
        return res.status(500).json({
            success: false,
            error: { code: 'INTERNAL_ERROR', message: error?.message || 'Failed to register patient' }
        });
    }
}

// ============================================================================
// ROUTE HANDLERS - APPOINTMENTS
// ============================================================================

async function handleGetAppointments(req: VercelRequest, res: VercelResponse) {
    const user = requireAuth(req, res);
    if (!user) return;

    try {
        const { date, doctorId, status, page = '1', limit = '10' } = req.query as Record<string, string>;
        const take = Math.min(parseInt(limit) || 10, 100);
        const skip = (Math.max(parseInt(page) || 1, 1) - 1) * take;

        const where: any = {
            hospitalId: user.hospitalId,
            deletedAt: null,
        };

        if (date) {
            const d = new Date(date);
            d.setHours(0, 0, 0, 0);
            const next = new Date(d);
            next.setDate(next.getDate() + 1);
            where.appointmentDate = { gte: d, lt: next };
        }
        if (doctorId) where.doctorId = doctorId;
        if (status) where.status = status;

        const [appointments, total] = await Promise.all([
            prisma.appointment.findMany({
                where,
                include: {
                    patient: {
                        select: { id: true, uhid: true, firstName: true, lastName: true, gender: true, dateOfBirth: true, mobilePrimary: true }
                    },
                    doctor: {
                        include: {
                            user: { select: { firstName: true, lastName: true } },
                            department: { select: { name: true } },
                        }
                    }
                },
                take,
                skip,
                orderBy: { appointmentDate: 'desc' }
            }),
            prisma.appointment.count({ where }),
        ]);

        return res.status(200).json({
            success: true,
            data: appointments,
            meta: { total, page: parseInt(page) || 1, limit: take, totalPages: Math.ceil(total / take) }
        });
    } catch (error) {
        console.error('Get appointments error:', error);
        return res.status(500).json({
            success: false,
            error: { code: 'INTERNAL_ERROR', message: 'An error occurred' }
        });
    }
}

async function handleGetAppointmentSlots(req: VercelRequest, res: VercelResponse) {
    const user = requireAuth(req, res);
    if (!user) return;

    try {
        const { doctorId, date } = req.query as Record<string, string>;
        if (!doctorId || !date) {
            return res.status(400).json({
                success: false,
                error: { code: 'VALIDATION_ERROR', message: 'doctorId and date are required' }
            });
        }

        const dayOfWeek = new Date(date).getDay();
        const schedules = await prisma.doctorSchedule.findMany({
            where: {
                doctorId,
                dayOfWeek,
                isActive: true,
            },
        });

        // Generate slots from schedules
        const slots: any[] = [];
        for (const schedule of schedules) {
            const [startH, startM] = schedule.startTime.split(':').map(Number);
            const [endH, endM] = schedule.endTime.split(':').map(Number);
            const startMinutes = startH * 60 + startM;
            const endMinutes = endH * 60 + endM;
            const duration = schedule.slotDuration;

            for (let m = startMinutes; m + duration <= endMinutes; m += duration + (schedule.bufferTime || 0)) {
                const h = Math.floor(m / 60);
                const min = m % 60;
                const time = `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
                slots.push({ time, available: true });
            }
        }

        // Check booked slots
        const bookedDate = new Date(date);
        bookedDate.setHours(0, 0, 0, 0);
        const nextDay = new Date(bookedDate);
        nextDay.setDate(nextDay.getDate() + 1);

        const booked = await prisma.appointment.findMany({
            where: {
                doctorId,
                appointmentDate: { gte: bookedDate, lt: nextDay },
                status: { notIn: ['CANCELLED', 'NO_SHOW'] },
                deletedAt: null,
            },
            select: { slotTime: true },
        });

        const bookedTimes = new Set(booked.map(b => b.slotTime));
        for (const slot of slots) {
            if (bookedTimes.has(slot.time)) {
                slot.available = false;
            }
        }

        return res.status(200).json({
            success: true,
            data: { slots },
        });
    } catch (error) {
        console.error('Get slots error:', error);
        return res.status(500).json({
            success: false,
            error: { code: 'INTERNAL_ERROR', message: 'An error occurred' }
        });
    }
}

async function handleCreateAppointment(req: VercelRequest, res: VercelResponse) {
    const user = requireAuth(req, res);
    if (!user) return;

    try {
        const data = req.body;

        // Get next token number
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const count = await prisma.appointment.count({
            where: {
                doctorId: data.doctorId,
                appointmentDate: { gte: today, lt: tomorrow },
                deletedAt: null,
            },
        });

        const tokenNumber = `A-${String(count + 1).padStart(3, '0')}`;

        const appointment = await prisma.appointment.create({
            data: {
                hospitalId: user.hospitalId,
                patientId: data.patientId,
                doctorId: data.doctorId,
                appointmentDate: new Date(data.date),
                slotTime: data.slotTime,
                consultationType: data.consultationType || 'NEW',
                chiefComplaint: data.chiefComplaint || undefined,
                tokenNumber,
                tokenPrefix: 'A',
                bookedVia: 'COUNTER',
                createdBy: user.userId,
                updatedBy: user.userId,
            },
        });

        return res.status(201).json({
            success: true,
            data: { id: appointment.id, tokenNumber },
            message: `Appointment booked. Token: ${tokenNumber}`,
        });
    } catch (error: any) {
        console.error('Create appointment error:', error);
        return res.status(500).json({
            success: false,
            error: { code: 'INTERNAL_ERROR', message: error?.message || 'Failed to create appointment' }
        });
    }
}

// ============================================================================
// ROUTE HANDLERS - DOCTORS
// ============================================================================

async function handleGetDoctors(req: VercelRequest, res: VercelResponse) {
    const user = requireAuth(req, res);
    if (!user) return;

    try {
        const doctors = await prisma.doctor.findMany({
            where: {
                hospitalId: user.hospitalId,
                deletedAt: null,
                isActive: true,
            },
            include: {
                user: { select: { firstName: true, lastName: true, email: true, phone: true } },
                department: { select: { id: true, name: true, code: true } },
            },
            take: 100
        });

        return res.status(200).json({
            success: true,
            data: doctors,
            meta: { total: doctors.length }
        });
    } catch (error) {
        console.error('Get doctors error:', error);
        return res.status(500).json({
            success: false,
            error: { code: 'INTERNAL_ERROR', message: 'An error occurred' }
        });
    }
}

// ============================================================================
// ROUTE HANDLERS - USERS
// ============================================================================

async function handleGetUsers(req: VercelRequest, res: VercelResponse) {
    const user = requireAuth(req, res);
    if (!user) return;

    try {
        const users = await prisma.user.findMany({
            where: {
                hospitalId: user.hospitalId,
                deletedAt: null,
            },
            select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                phone: true,
                status: true,
                lastLoginAt: true,
                createdAt: true,
                role: { select: { id: true, name: true, code: true } },
            },
            take: 100,
            orderBy: { createdAt: 'desc' },
        });

        return res.status(200).json({
            success: true,
            data: users,
            meta: { total: users.length },
        });
    } catch (error) {
        console.error('Get users error:', error);
        return res.status(500).json({
            success: false,
            error: { code: 'INTERNAL_ERROR', message: 'An error occurred' }
        });
    }
}

async function handleGetUserRoles(req: VercelRequest, res: VercelResponse) {
    const user = requireAuth(req, res);
    if (!user) return;

    try {
        const roles = await prisma.role.findMany({
            where: { deletedAt: null },
            select: { id: true, name: true, code: true, description: true, isSystemRole: true },
            orderBy: { name: 'asc' },
        });

        return res.status(200).json({
            success: true,
            data: roles,
        });
    } catch (error) {
        console.error('Get roles error:', error);
        return res.status(500).json({
            success: false,
            error: { code: 'INTERNAL_ERROR', message: 'An error occurred' }
        });
    }
}

async function handleCreateUser(req: VercelRequest, res: VercelResponse) {
    const user = requireAuth(req, res);
    if (!user) return;

    try {
        const data = req.body;
        const passwordHash = await bcrypt.hash(data.password || 'Welcome@123', 10);

        const newUser = await prisma.user.create({
            data: {
                hospitalId: user.hospitalId,
                email: data.email,
                passwordHash,
                firstName: data.firstName,
                lastName: data.lastName,
                phone: data.phone || undefined,
                roleId: data.roleId,
                status: 'ACTIVE',
                createdBy: user.userId,
                updatedBy: user.userId,
            },
        });

        return res.status(201).json({
            success: true,
            data: { id: newUser.id },
            message: 'User created successfully',
        });
    } catch (error: any) {
        console.error('Create user error:', error);
        if (error?.code === 'P2002') {
            return res.status(409).json({
                success: false,
                error: { code: 'DUPLICATE', message: 'A user with this email already exists' }
            });
        }
        return res.status(500).json({
            success: false,
            error: { code: 'INTERNAL_ERROR', message: error?.message || 'Failed to create user' }
        });
    }
}

// ============================================================================
// ROUTE HANDLERS - SETTINGS
// ============================================================================

async function handleGetModules(req: VercelRequest, res: VercelResponse) {
    const user = requireAuth(req, res);
    if (!user) return;

    try {
        let enabledModules = DEFAULT_ENABLED_MODULES;

        // Try to get hospital-specific modules
        try {
            const hospital = await prisma.hospital.findUnique({
                where: { id: user.hospitalId },
                select: { enabledModules: true },
            });
            if (hospital && hospital.enabledModules && Array.isArray(hospital.enabledModules)) {
                enabledModules = hospital.enabledModules;
            }
        } catch {
            // Fallback to defaults
        }

        return res.status(200).json({
            success: true,
            data: {
                enabledModules,
                availableModules: AVAILABLE_MODULES.map(m => ({
                    ...m,
                    enabled: enabledModules.includes(m.code),
                })),
                _debug_version: '1.3-api-fix-verified',
            },
        });
    } catch (error) {
        console.error('Get modules error:', error);
        return res.status(500).json({
            success: false,
            error: { code: 'INTERNAL_ERROR', message: 'An error occurred' }
        });
    }
}

async function handleUpdateModules(req: VercelRequest, res: VercelResponse) {
    const user = requireAuth(req, res);
    if (!user) return;

    try {
        let { enabledModules } = req.body;
        if (!Array.isArray(enabledModules)) {
            return res.status(400).json({
                success: false,
                error: { code: 'VALIDATION_ERROR', message: 'enabledModules must be an array' }
            });
        }

        // Ensure dashboard is always enabled
        if (!enabledModules.includes('dashboard')) {
            enabledModules = ['dashboard', ...enabledModules];
        }

        // Try to update hospital
        try {
            await prisma.$executeRawUnsafe(
                `UPDATE "Hospital" SET "enabledModules" = $1::text[] WHERE id = $2`,
                enabledModules,
                user.hospitalId
            );
        } catch {
            // Field doesn't exist yet, that's ok
        }

        return res.status(200).json({
            success: true,
            data: { enabledModules },
            message: 'Module settings updated successfully',
        });
    } catch (error) {
        console.error('Update modules error:', error);
        return res.status(500).json({
            success: false,
            error: { code: 'INTERNAL_ERROR', message: 'An error occurred' }
        });
    }
}

async function handleGetHospitalSettings(req: VercelRequest, res: VercelResponse) {
    const user = requireAuth(req, res);
    if (!user) return;

    try {
        const hospital = await prisma.hospital.findUnique({
            where: { id: user.hospitalId },
        });

        if (!hospital) {
            return res.status(404).json({
                success: false,
                error: { code: 'NOT_FOUND', message: 'Hospital not found' }
            });
        }

        return res.status(200).json({
            success: true,
            data: hospital,
        });
    } catch (error) {
        console.error('Get hospital settings error:', error);
        return res.status(500).json({
            success: false,
            error: { code: 'INTERNAL_ERROR', message: 'An error occurred' }
        });
    }
}

async function handleUpdateHospitalSettings(req: VercelRequest, res: VercelResponse) {
    const user = requireAuth(req, res);
    if (!user) return;

    try {
        const updateData = req.body;
        const hospital = await prisma.hospital.update({
            where: { id: user.hospitalId },
            data: {
                ...updateData,
                updatedBy: user.userId,
            },
        });

        return res.status(200).json({
            success: true,
            data: hospital,
            message: 'Hospital settings updated successfully',
        });
    } catch (error) {
        console.error('Update hospital settings error:', error);
        return res.status(500).json({
            success: false,
            error: { code: 'INTERNAL_ERROR', message: 'An error occurred' }
        });
    }
}

async function handleGetSettingsRoles(req: VercelRequest, res: VercelResponse) {
    const user = requireAuth(req, res);
    if (!user) return;

    try {
        const roles = await prisma.role.findMany({
            where: { deletedAt: null },
            include: {
                permissions: {
                    include: { permission: true },
                },
                _count: { select: { users: true } },
            },
            orderBy: { name: 'asc' },
        });

        return res.status(200).json({
            success: true,
            data: roles,
        });
    } catch (error) {
        console.error('Get settings roles error:', error);
        return res.status(500).json({
            success: false,
            error: { code: 'INTERNAL_ERROR', message: 'An error occurred' }
        });
    }
}

async function handleGetPermissions(req: VercelRequest, res: VercelResponse) {
    const user = requireAuth(req, res);
    if (!user) return;

    try {
        const permissions = await prisma.permission.findMany({
            orderBy: [{ module: 'asc' }, { action: 'asc' }],
        });

        // Group by module
        const grouped: Record<string, any[]> = {};
        for (const p of permissions) {
            if (!grouped[p.module]) grouped[p.module] = [];
            grouped[p.module].push(p);
        }

        return res.status(200).json({
            success: true,
            data: grouped,
        });
    } catch (error) {
        console.error('Get permissions error:', error);
        return res.status(500).json({
            success: false,
            error: { code: 'INTERNAL_ERROR', message: 'An error occurred' }
        });
    }
}

async function handleGetDepartments(req: VercelRequest, res: VercelResponse) {
    const user = requireAuth(req, res);
    if (!user) return;

    try {
        const departments = await prisma.department.findMany({
            where: {
                hospitalId: user.hospitalId,
                deletedAt: null,
            },
            include: {
                _count: { select: { doctors: true } },
            },
            orderBy: { displayOrder: 'asc' },
        });

        return res.status(200).json({
            success: true,
            data: departments,
        });
    } catch (error) {
        console.error('Get departments error:', error);
        return res.status(500).json({
            success: false,
            error: { code: 'INTERNAL_ERROR', message: 'An error occurred' }
        });
    }
}

async function handleCreateDepartment(req: VercelRequest, res: VercelResponse) {
    const user = requireAuth(req, res);
    if (!user) return;

    try {
        const data = req.body;
        const department = await prisma.department.create({
            data: {
                hospitalId: user.hospitalId,
                name: data.name,
                code: data.code.toUpperCase(),
                description: data.description || undefined,
                displayOrder: data.displayOrder || 0,
                createdBy: user.userId,
                updatedBy: user.userId,
            },
        });

        return res.status(201).json({
            success: true,
            data: department,
            message: 'Department created successfully',
        });
    } catch (error: any) {
        console.error('Create department error:', error);
        if (error?.code === 'P2002') {
            return res.status(409).json({
                success: false,
                error: { code: 'DUPLICATE', message: 'A department with this code already exists' }
            });
        }
        return res.status(500).json({
            success: false,
            error: { code: 'INTERNAL_ERROR', message: error?.message || 'Failed to create department' }
        });
    }
}

// ============================================================================
// ROUTE HANDLERS - OPD
// ============================================================================

async function handleOpdDashboard(req: VercelRequest, res: VercelResponse) {
    const user = requireAuth(req, res);
    if (!user) return;

    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const [appointmentStats, queueStats] = await Promise.all([
            prisma.appointment.groupBy({
                by: ['status'],
                where: {
                    hospitalId: user.hospitalId,
                    appointmentDate: { gte: today, lt: tomorrow },
                    deletedAt: null,
                },
                _count: true,
            }),
            prisma.opdQueue.groupBy({
                by: ['status'],
                where: {
                    hospitalId: user.hospitalId,
                    queueDate: { gte: today, lt: tomorrow },
                },
                _count: true,
            }),
        ]);

        const doctorQueues = await prisma.doctor.findMany({
            where: {
                hospitalId: user.hospitalId,
                isActive: true,
                deletedAt: null,
            },
            select: {
                id: true,
                user: { select: { firstName: true, lastName: true } },
                department: { select: { name: true } },
                _count: {
                    select: {
                        opdQueues: {
                            where: {
                                queueDate: { gte: today, lt: tomorrow },
                                status: 'WAITING',
                            },
                        },
                    },
                },
            },
        });

        return res.status(200).json({
            success: true,
            data: {
                date: today.toISOString().split('T')[0],
                appointments: {
                    total: appointmentStats.reduce((s, x) => s + x._count, 0),
                    byStatus: appointmentStats.reduce((a, x) => { a[x.status] = x._count; return a; }, {} as Record<string, number>),
                },
                queue: {
                    total: queueStats.reduce((s, x) => s + x._count, 0),
                    byStatus: queueStats.reduce((a, x) => { a[x.status] = x._count; return a; }, {} as Record<string, number>),
                },
                doctorQueues: doctorQueues.map(d => ({
                    doctorId: d.id,
                    doctorName: `Dr. ${d.user.firstName} ${d.user.lastName}`,
                    department: d.department.name,
                    waitingCount: d._count.opdQueues,
                })),
            },
        });
    } catch (error) {
        console.error('OPD dashboard error:', error);
        return res.status(500).json({
            success: false,
            error: { code: 'INTERNAL_ERROR', message: 'An error occurred' }
        });
    }
}

async function handleOpdCallNext(req: VercelRequest, res: VercelResponse, doctorId: string) {
    const user = requireAuth(req, res);
    if (!user) return;

    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        // Check current consultation
        const current = await prisma.opdQueue.findFirst({
            where: { doctorId, queueDate: { gte: today, lt: tomorrow }, status: 'IN_CONSULTATION' },
        });

        if (current) {
            return res.status(400).json({
                success: false,
                error: { code: 'PATIENT_IN_CONSULTATION', message: 'Please complete current consultation first' }
            });
        }

        const next = await prisma.opdQueue.findFirst({
            where: { doctorId, queueDate: { gte: today, lt: tomorrow }, status: 'WAITING' },
            orderBy: { position: 'asc' },
            include: { patient: { select: { uhid: true, firstName: true, lastName: true } } },
        });

        if (!next) {
            return res.status(404).json({
                success: false,
                error: { code: 'NO_WAITING_PATIENTS', message: 'No patients waiting in queue' }
            });
        }

        const now = new Date();
        const [updatedQueue] = await prisma.$transaction([
            prisma.opdQueue.update({
                where: { id: next.id },
                data: {
                    status: 'IN_CONSULTATION',
                    callTime: now,
                    startTime: now,
                    actualWait: Math.floor((now.getTime() - (next.checkInTime?.getTime() || now.getTime())) / 60000),
                },
            }),
            prisma.appointment.update({
                where: { id: next.appointmentId },
                data: { status: 'IN_CONSULTATION', consultationStartAt: now, updatedBy: user.userId },
            }),
        ]);

        return res.status(200).json({
            success: true,
            data: { ...updatedQueue, patient: next.patient },
            message: `Called patient: ${next.patient.firstName} ${next.patient.lastName}`,
        });
    } catch (error) {
        console.error('OPD call-next error:', error);
        return res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'An error occurred' } });
    }
}

async function handleOpdComplete(req: VercelRequest, res: VercelResponse, queueId: string) {
    const user = requireAuth(req, res);
    if (!user) return;

    try {
        const queue = await prisma.opdQueue.findUnique({ where: { id: queueId } });
        if (!queue || queue.hospitalId !== user.hospitalId) {
            return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Queue entry not found' } });
        }

        const now = new Date();
        const [updatedQueue] = await prisma.$transaction([
            prisma.opdQueue.update({ where: { id: queueId }, data: { status: 'COMPLETED', endTime: now } }),
            prisma.appointment.update({ where: { id: queue.appointmentId }, data: { status: 'COMPLETED', consultationEndAt: now, updatedBy: user.userId } }),
        ]);

        return res.status(200).json({ success: true, data: updatedQueue, message: 'Consultation completed' });
    } catch (error) {
        console.error('OPD complete error:', error);
        return res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'An error occurred' } });
    }
}

async function handleOpdSkip(req: VercelRequest, res: VercelResponse, queueId: string) {
    const user = requireAuth(req, res);
    if (!user) return;

    try {
        const queue = await prisma.opdQueue.findUnique({ where: { id: queueId } });
        if (!queue || queue.hospitalId !== user.hospitalId) {
            return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Queue entry not found' } });
        }

        const reason = req.body?.reason || 'Skipped';
        const [updatedQueue] = await prisma.$transaction([
            prisma.opdQueue.update({ where: { id: queueId }, data: { status: 'SKIPPED' } }),
            prisma.appointment.update({ where: { id: queue.appointmentId }, data: { status: 'NO_SHOW', cancellationReason: reason, updatedBy: user.userId } }),
        ]);

        return res.status(200).json({ success: true, data: updatedQueue, message: 'Patient skipped' });
    } catch (error) {
        console.error('OPD skip error:', error);
        return res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'An error occurred' } });
    }
}

// ============================================================================
// ROUTE HANDLERS - IPD (Real database queries)
// ============================================================================

// Get single admission details
async function handleGetAdmission(req: VercelRequest, res: VercelResponse, id: string) {
    const user = requireAuth(req, res);
    if (!user) return;

    try {
        const admission = await prisma.admission.findFirst({
            where: { id, hospitalId: user.hospitalId },
            include: {
                patient: {
                    select: {
                        id: true,
                        uhid: true,
                        firstName: true,
                        lastName: true,
                        gender: true,
                        dateOfBirth: true,
                        mobilePrimary: true,
                        bloodGroup: true,
                    }
                },
                admittingDoctor: {
                    include: {
                        user: { select: { firstName: true, lastName: true } },
                        department: { select: { name: true } }
                    }
                },
                attendingDoctor: {
                    include: {
                        user: { select: { firstName: true, lastName: true } }
                    }
                },
                bed: {
                    include: {
                        ward: { select: { id: true, name: true, type: true } }
                    }
                },
                nursingNotes: {
                    orderBy: { recordedAt: 'desc' },
                    include: { createdBy: { select: { firstName: true, lastName: true } } } // If needed
                },
                doctorRounds: {
                    orderBy: { roundDate: 'desc' },
                    include: {
                        doctor: {
                            include: { user: { select: { firstName: true, lastName: true } } }
                        }
                    }
                },
                bedTransfers: {
                    orderBy: { transferDate: 'desc' },
                    include: {
                        fromBed: { include: { ward: { select: { name: true } } } },
                        toBed: { include: { ward: { select: { name: true } } } }
                    }
                }
            }
        });

        if (!admission) {
            return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Admission not found' } });
        }

        // Map nursing notes to include recordedByName if available or just use createdBy
        const mappedAdmission = {
            ...admission,
            nursingNotes: admission.nursingNotes.map(n => ({
                ...n,
                recordedByName: n.recordedByName || 'Nurse'
            }))
        };

        return res.status(200).json({ success: true, data: mappedAdmission });
    } catch (error: any) {
        console.error('Get Admission error:', error);
        return res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: error.message } });
    }
}

// Get OPD Queue
async function handleOpdQueue(req: VercelRequest, res: VercelResponse, doctorId: string) {
    const user = requireAuth(req, res);
    if (!user) return;

    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const queue = await prisma.opdQueue.findMany({
            where: {
                hospitalId: user.hospitalId,
                doctorId,
                queueDate: { gte: today, lt: tomorrow },
                status: { not: 'COMPLETED' },
                deletedAt: null
            },
            include: {
                patient: {
                    select: {
                        id: true,
                        uhid: true,
                        firstName: true,
                        lastName: true,
                        gender: true,
                        mobilePrimary: true,
                        dateOfBirth: true
                    }
                },
                appointment: {
                    select: {
                        consultationType: true,
                        chiefComplaint: true
                    }
                }
            },
            orderBy: { position: 'asc' }
        });

        // Calculate age and format for frontend
        const formattedQueue = queue.map(item => {
            let age = 0;
            if (item.patient.dateOfBirth) {
                const dob = new Date(item.patient.dateOfBirth);
                const diffMs = Date.now() - dob.getTime();
                const ageDt = new Date(diffMs);
                age = Math.abs(ageDt.getUTCFullYear() - 1970);
            }

            return {
                id: item.id,
                tokenNumber: item.tokenNumber,
                status: item.status,
                position: item.tokenNumber, // Simplified
                checkInTime: item.checkInTime,
                estimatedWait: 15, // Mock
                patient: item.patient,
                appointment: item.appointment || { consultationType: 'General', chiefComplaint: '' },
                patientAge: age
            };
        });

        return res.status(200).json({ success: true, data: { queue: formattedQueue } });
    } catch (error: any) {
        console.error('Get OPD Queue error:', error);
        return res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: error.message } });
    }
}

async function handleIpdDashboard(req: VercelRequest, res: VercelResponse) {
    const user = requireAuth(req, res);
    if (!user) return;

    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        // Get total beds
        const totalBeds = await prisma.bed.count({
            where: { ward: { hospitalId: user.hospitalId }, isActive: true, deletedAt: null },
        });

        // Get occupied beds
        const occupiedBeds = await prisma.bed.count({
            where: { ward: { hospitalId: user.hospitalId }, status: 'OCCUPIED', isActive: true, deletedAt: null },
        });

        // Today's admissions
        const todayAdmissions = await prisma.admission.count({
            where: {
                hospitalId: user.hospitalId,
                admissionDate: { gte: today, lt: tomorrow },
                deletedAt: null,
            },
        });

        // Today's discharges
        const todayDischarges = await prisma.admission.count({
            where: {
                hospitalId: user.hospitalId,
                dischargeDate: { gte: today, lt: tomorrow },
                deletedAt: null,
            },
        });

        // Ward stats
        const wards = await prisma.ward.findMany({
            where: { hospitalId: user.hospitalId, isActive: true, deletedAt: null },
            include: {
                beds: {
                    where: { isActive: true, deletedAt: null },
                    select: { id: true, status: true },
                },
            },
            orderBy: { displayOrder: 'asc' },
        });

        const wardStats = wards.map(ward => ({
            id: ward.id,
            name: ward.name,
            code: ward.code,
            type: ward.type,
            totalBeds: ward.beds.length,
            occupiedBeds: ward.beds.filter(b => b.status === 'OCCUPIED').length,
            availableBeds: ward.beds.filter(b => b.status === 'AVAILABLE').length,
            maintenanceBeds: ward.beds.filter(b => b.status === 'MAINTENANCE').length,
        }));

        const availableBeds = totalBeds - occupiedBeds;
        const occupancyRate = totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0;

        return res.status(200).json({
            success: true,
            data: {
                totalBeds,
                occupiedBeds,
                availableBeds,
                todayAdmissions,
                todayDischarges,
                occupancyRate,
                wardStats,
            },
        });
    } catch (error: any) {
        console.error('IPD Dashboard error:', error);
        return res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: error.message } });
    }
}

async function handleIpdAdmissions(req: VercelRequest, res: VercelResponse) {
    const user = requireAuth(req, res);
    if (!user) return;

    try {
        const url = new URL(req.url || '', `http://${req.headers.host}`);
        const status = url.searchParams.get('status');
        const page = parseInt(url.searchParams.get('page') || '1');
        const limit = parseInt(url.searchParams.get('limit') || '20');
        const skip = (page - 1) * limit;

        const where: any = { hospitalId: user.hospitalId, deletedAt: null };
        if (status) where.status = status;

        const [admissions, total] = await Promise.all([
            prisma.admission.findMany({
                where,
                include: {
                    patient: { select: { id: true, firstName: true, lastName: true, uhid: true, mobilePrimary: true, gender: true, dateOfBirth: true } },
                    admittingDoctor: { include: { user: { select: { firstName: true, lastName: true } } } },
                    attendingDoctor: { include: { user: { select: { firstName: true, lastName: true } } } },
                    bed: { include: { ward: { select: { name: true, code: true, type: true } } } },
                },
                orderBy: { admissionDate: 'desc' },
                skip,
                take: limit,
            }),
            prisma.admission.count({ where }),
        ]);

        return res.status(200).json({
            success: true,
            data: admissions,
            meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
        });
    } catch (error: any) {
        console.error('IPD Admissions error:', error);
        return res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: error.message } });
    }
}

async function handleIpdWards(req: VercelRequest, res: VercelResponse) {
    const user = requireAuth(req, res);
    if (!user) return;

    try {
        const wards = await prisma.ward.findMany({
            where: { hospitalId: user.hospitalId, isActive: true, deletedAt: null },
            include: {
                beds: {
                    where: { isActive: true, deletedAt: null },
                    select: { id: true, bedNumber: true, bedType: true, status: true, dailyRate: true },
                },
            },
            orderBy: { displayOrder: 'asc' },
        });

        return res.status(200).json({
            success: true,
            data: wards,
        });
    } catch (error: any) {
        console.error('IPD Wards error:', error);
        return res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: error.message } });
    }
}

async function handleIpdBeds(req: VercelRequest, res: VercelResponse) {
    const user = requireAuth(req, res);
    if (!user) return;

    try {
        const url = new URL(req.url || '', `http://${req.headers.host}`);
        const wardId = url.searchParams.get('wardId');
        const status = url.searchParams.get('status');

        const where: any = {
            ward: { hospitalId: user.hospitalId },
            isActive: true,
            deletedAt: null,
        };
        if (wardId) where.wardId = wardId;
        if (status) where.status = status;

        const beds = await prisma.bed.findMany({
            where,
            include: {
                ward: { select: { id: true, name: true, code: true, type: true } },
                admissions: {
                    where: { status: 'ADMITTED', deletedAt: null },
                    include: {
                        patient: { select: { id: true, firstName: true, lastName: true, uhid: true } },
                    },
                    take: 1,
                },
            },
            orderBy: { bedNumber: 'asc' },
        });

        return res.status(200).json({
            success: true,
            data: beds,
        });
    } catch (error: any) {
        console.error('IPD Beds error:', error);
        return res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: error.message } });
    }
}

async function handleIpdAdmit(req: VercelRequest, res: VercelResponse) {
    const user = requireAuth(req, res);
    if (!user) return;

    try {
        const body = req.body;

        // Generate admission number
        const now = new Date();
        const yearMonth = `${String(now.getFullYear()).slice(2)}${String(now.getMonth() + 1).padStart(2, '0')}`;

        const sequence = await prisma.admissionSequence.upsert({
            where: { hospitalId_yearMonth: { hospitalId: user.hospitalId, yearMonth } },
            create: { hospitalId: user.hospitalId, yearMonth, lastSeq: 1 },
            update: { lastSeq: { increment: 1 } },
        });

        const admissionNo = `ADM-${yearMonth}-${String(sequence.lastSeq).padStart(4, '0')}`;

        // Create admission and update bed status in transaction
        const admission = await prisma.$transaction(async (tx) => {
            // Mark bed as occupied
            await tx.bed.update({
                where: { id: body.bedId },
                data: { status: 'OCCUPIED', updatedBy: user.userId },
            });

            // Create admission record
            return tx.admission.create({
                data: {
                    hospitalId: user.hospitalId,
                    admissionNo,
                    patientId: body.patientId,
                    admittingDoctorId: body.admittingDoctorId || body.doctorId,
                    attendingDoctorId: body.attendingDoctorId,
                    bedId: body.bedId,
                    admissionDate: body.admissionDate ? new Date(body.admissionDate) : new Date(),
                    admissionType: body.admissionType || 'ELECTIVE',
                    admissionReason: body.admissionReason || body.reason || 'Admission',
                    chiefComplaint: body.chiefComplaint,
                    provisionalDiagnosis: body.provisionalDiagnosis || body.diagnosis,
                    expectedStayDays: body.expectedStayDays ? parseInt(body.expectedStayDays) : null,
                    expectedDischarge: body.expectedDischarge ? new Date(body.expectedDischarge) : null,
                    isInsured: body.isInsured || false,
                    insuranceApprovalNo: body.insuranceApprovalNo,
                    createdBy: user.userId,
                    updatedBy: user.userId,
                },
                include: {
                    patient: { select: { firstName: true, lastName: true, uhid: true } },
                    bed: { include: { ward: { select: { name: true } } } },
                    admittingDoctor: { include: { user: { select: { firstName: true, lastName: true } } } },
                },
            });
        });

        return res.status(201).json({ success: true, data: admission });
    } catch (error: any) {
        console.error('IPD Admit error:', error);
        return res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: error.message } });
    }
}

async function handleIpdNursingNote(req: VercelRequest, res: VercelResponse) {
    const user = requireAuth(req, res);
    if (!user) return;

    try {
        const body = req.body;

        const nursingNote = await prisma.nursingNote.create({
            data: {
                admissionId: body.admissionId,
                noteType: body.noteType || 'ROUTINE',
                shift: body.shift,
                content: body.content || body.notes || '',
                temperature: body.temperature ? parseFloat(body.temperature) : null,
                bpSystolic: body.bpSystolic ? parseInt(body.bpSystolic) : null,
                bpDiastolic: body.bpDiastolic ? parseInt(body.bpDiastolic) : null,
                pulseRate: body.pulseRate ? parseInt(body.pulseRate) : null,
                respiratoryRate: body.respiratoryRate ? parseInt(body.respiratoryRate) : null,
                spO2: body.spO2 ? parseInt(body.spO2) : null,
                recordedBy: user.userId,
                recordedByName: body.recordedByName,
            },
        });

        return res.status(201).json({ success: true, data: nursingNote });
    } catch (error: any) {
        console.error('IPD Nursing Note error:', error);
        return res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: error.message } });
    }
}

async function handleIpdDischarge(req: VercelRequest, res: VercelResponse, admissionId: string) {
    const user = requireAuth(req, res);
    if (!user) return;

    try {
        const body = req.body;

        // Discharge admission and free bed in transaction
        const admission = await prisma.$transaction(async (tx) => {
            // Get admission to find bed
            const existing = await tx.admission.findUnique({
                where: { id: admissionId },
                select: { bedId: true },
            });

            if (!existing) throw new Error('Admission not found');

            // Free the bed
            await tx.bed.update({
                where: { id: existing.bedId },
                data: { status: 'AVAILABLE', updatedBy: user.userId },
            });

            // Update admission
            return tx.admission.update({
                where: { id: admissionId },
                data: {
                    status: 'DISCHARGED',
                    dischargeDate: body.dischargeDate ? new Date(body.dischargeDate) : new Date(),
                    dischargeType: body.dischargeType || 'Normal',
                    dischargeSummary: body.dischargeSummary || body.summary,
                    dischargeAdvice: body.dischargeAdvice || body.advice,
                    followUpDate: body.followUpDate ? new Date(body.followUpDate) : null,
                    updatedBy: user.userId,
                },
                include: {
                    patient: { select: { firstName: true, lastName: true, uhid: true } },
                    bed: { include: { ward: { select: { name: true } } } },
                },
            });
        });

        return res.status(200).json({ success: true, data: admission });
    } catch (error: any) {
        console.error('IPD Discharge error:', error);
        return res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: error.message } });
    }
}


// ============================================================================
// MAIN HANDLER
// ============================================================================

export default async function handler(req: VercelRequest, res: VercelResponse) {
    setCorsHeaders(res);
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        const { url, method } = req;
        let path = url?.replace(/\?.*$/, '') || '';

        // Debug endpoint
        if (path === '/api' || path === '/api/' || path.endsWith('/api')) {
            return res.status(200).json({
                success: true,
                message: 'HMS API is running',
                debug: { url, path, method, hasDbUrl: !!process.env.DATABASE_URL, hasJwtSecret: !!process.env.JWT_SECRET },
            });
        }

        // Normalize path
        if (!path.startsWith('/api')) {
            path = '/api' + path;
        }

        // Also handle double /api/api prefix (from Vercel rewrites)
        const normalizedPath = path.replace('/api/api/', '/api/');

        // ---- HEALTH ----
        if (normalizedPath === '/api/v1/health' && method === 'GET') {
            return handleHealth(res);
        }

        // ---- AUTH ----
        if (normalizedPath === '/api/v1/auth/login' && method === 'POST') {
            return handleLogin(req, res);
        }
        if (normalizedPath === '/api/v1/auth/me' && method === 'GET') {
            return handleGetMe(req, res);
        }
        if (normalizedPath === '/api/v1/auth/logout' && method === 'POST') {
            return res.status(200).json({ success: true, message: 'Logged out successfully' });
        }
        if (normalizedPath === '/api/v1/auth/refresh' && method === 'POST') {
            return res.status(401).json({ success: false, error: { code: 'NOT_IMPLEMENTED', message: 'Token refresh not available. Please login again.' } });
        }

        // ---- PATIENTS ----
        if (normalizedPath === '/api/v1/patients' && method === 'GET') {
            return handleGetPatients(req, res);
        }
        if (normalizedPath === '/api/v1/patients' && method === 'POST') {
            return handleCreatePatient(req, res);
        }

        // ---- APPOINTMENTS ----
        if (normalizedPath === '/api/v1/appointments' && method === 'GET') {
            return handleGetAppointments(req, res);
        }
        if (normalizedPath === '/api/v1/appointments' && method === 'POST') {
            return handleCreateAppointment(req, res);
        }
        if (normalizedPath === '/api/v1/appointments/slots' && method === 'GET') {
            return handleGetAppointmentSlots(req, res);
        }

        // ---- DOCTORS ----
        if (normalizedPath === '/api/v1/doctors' && method === 'GET') {
            return handleGetDoctors(req, res);
        }

        // ---- USERS ----
        if (normalizedPath === '/api/v1/users' && method === 'GET') {
            return handleGetUsers(req, res);
        }
        if (normalizedPath === '/api/v1/users' && method === 'POST') {
            return handleCreateUser(req, res);
        }
        if (normalizedPath === '/api/v1/users/roles' && method === 'GET') {
            return handleGetUserRoles(req, res);
        }

        // ---- SETTINGS ----
        if (normalizedPath === '/api/v1/settings/modules' && method === 'GET') {
            return handleGetModules(req, res);
        }
        if (normalizedPath === '/api/v1/settings/modules' && method === 'PUT') {
            return handleUpdateModules(req, res);
        }
        if (normalizedPath === '/api/v1/settings/hospital' && method === 'GET') {
            return handleGetHospitalSettings(req, res);
        }
        if (normalizedPath === '/api/v1/settings/hospital' && method === 'PUT') {
            return handleUpdateHospitalSettings(req, res);
        }
        if (normalizedPath === '/api/v1/settings/roles' && method === 'GET') {
            return handleGetSettingsRoles(req, res);
        }
        if (normalizedPath === '/api/v1/settings/permissions' && method === 'GET') {
            return handleGetPermissions(req, res);
        }
        if (normalizedPath === '/api/v1/settings/departments' && method === 'GET') {
            return handleGetDepartments(req, res);
        }
        if (normalizedPath === '/api/v1/settings/departments' && method === 'POST') {
            return handleCreateDepartment(req, res);
        }

        // ---- OPD ----
        if (normalizedPath === '/api/v1/opd/dashboard' && method === 'GET') {
            return handleOpdDashboard(req, res);
        }

        // OPD routes with path params
        let params: Record<string, string> | null;

        params = matchPath(normalizedPath, '/api/v1/opd/call-next/:doctorId');
        if (params && method === 'POST') {
            return handleOpdCallNext(req, res, params.doctorId);
        }

        params = matchPath(normalizedPath, '/api/v1/opd/complete/:queueId');
        if (params && method === 'POST') {
            return handleOpdComplete(req, res, params.queueId);
        }

        params = matchPath(normalizedPath, '/api/v1/opd/skip/:queueId');
        if (params && method === 'POST') {
            return handleOpdSkip(req, res, params.queueId);
        }

        // ---- IPD ----
        if (normalizedPath === '/api/v1/ipd/dashboard' && method === 'GET') {
            return handleIpdDashboard(req, res);
        }
        if (normalizedPath === '/api/v1/ipd/admissions' && method === 'GET') {
            return handleIpdAdmissions(req, res);
        }
        if (normalizedPath === '/api/v1/ipd/wards' && method === 'GET') {
            return handleIpdWards(req, res);
        }
        if (normalizedPath === '/api/v1/ipd/beds' && method === 'GET') {
            return handleIpdBeds(req, res);
        }
        if (normalizedPath === '/api/v1/ipd/admit' && method === 'POST') {
            return handleIpdAdmit(req, res);
        }
        if (normalizedPath === '/api/v1/ipd/nursing-note' && method === 'POST') {
            return handleIpdNursingNote(req, res);
        }

        params = matchPath(normalizedPath, '/api/v1/ipd/admissions/:id');
        if (params && method === 'GET') {
            return handleGetAdmission(req, res, params.id);
        }

        params = matchPath(normalizedPath, '/api/v1/ipd/discharge/:id');
        if (params && method === 'POST') {
            return handleIpdDischarge(req, res, params.id);
        }

        params = matchPath(normalizedPath, '/api/v1/opd/queue/:doctorId');
        if (params && method === 'GET') {
            return handleOpdQueue(req, res, params.doctorId);
        }


        // 404 for unmatched API routes
        return res.status(404).json({
            success: false,
            error: { code: 'NOT_FOUND', message: `Endpoint ${method} ${normalizedPath} not found` },
        });
    } catch (error: any) {
        console.error('Handler error:', error);
        return res.status(500).json({
            success: false,
            error: { code: 'HANDLER_ERROR', message: error?.message || 'Unknown error' }
        });
    }
}
