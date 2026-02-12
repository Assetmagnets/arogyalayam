// ============================================================================
// HMS Backend - Main Server Entry Point
// Express application with all middleware and routes
// ============================================================================

import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { env, prisma, disconnectPrisma } from './config/index.js';
import {
    errorHandler,
    notFoundHandler,
    auditLog,
    requestId,
} from './middleware/index.js';

// Import routes
import authRoutes from './routes/auth.routes.js';
import patientRoutes from './routes/patients.routes.js';
import appointmentRoutes from './routes/appointments.routes.js';
import doctorRoutes from './routes/doctors.routes.js';
import userRoutes from './routes/users.routes.js';
import settingsRoutes from './routes/settings.routes.js';
import opdRoutes from './routes/opd.routes.js';
import ipdRoutes from './routes/ipd.routes.js';
import ipdClinicalRoutes from './routes/ipd-clinical.routes.js';
import emrRoutes from './routes/emr.routes.js';

// ============================================================================
// APP SETUP
// ============================================================================

const app: Express = express();

// Trust proxy (for rate limiting behind reverse proxy)
app.set('trust proxy', 1);

// ============================================================================
// GLOBAL MIDDLEWARE
// ============================================================================

// Security headers
app.use(helmet());

// CORS
app.use(
    cors({
        origin: env.CORS_ORIGIN.split(','),
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
    })
);

// Rate limiting
const limiter = rateLimit({
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    max: env.RATE_LIMIT_MAX,
    message: {
        success: false,
        error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: 'Too many requests. Please try again later.',
        },
    },
    standardHeaders: true,
    legacyHeaders: false,
});
app.use(limiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request ID for tracing
app.use(requestId);

// Audit logging
app.use(auditLog);

// ============================================================================
// HEALTH CHECK
// ============================================================================

app.get('/health', (_req, res) => {
    res.json({
        success: true,
        data: {
            status: 'healthy',
            timestamp: new Date().toISOString(),
            environment: env.NODE_ENV,
        },
    });
});

app.get('/api/v1/health', async (_req, res) => {
    try {
        // Check database connection
        await prisma.$queryRaw`SELECT 1`;

        res.json({
            success: true,
            data: {
                status: 'healthy',
                database: 'connected',
                timestamp: new Date().toISOString(),
                environment: env.NODE_ENV,
            },
        });
    } catch (error) {
        res.status(503).json({
            success: false,
            data: {
                status: 'unhealthy',
                database: 'disconnected',
                timestamp: new Date().toISOString(),
            },
        });
    }
});

// ============================================================================
// API ROUTES
// ============================================================================

const API_PREFIX = '/api/v1';

app.use(`${API_PREFIX}/auth`, authRoutes);
app.use(`${API_PREFIX}/patients`, patientRoutes);
app.use(`${API_PREFIX}/appointments`, appointmentRoutes);
app.use(`${API_PREFIX}/doctors`, doctorRoutes);
app.use(`${API_PREFIX}/users`, userRoutes);
app.use(`${API_PREFIX}/settings`, settingsRoutes);
app.use(`${API_PREFIX}/opd`, opdRoutes);
app.use(`${API_PREFIX}/ipd`, ipdRoutes);
app.use(`${API_PREFIX}/ipd/clinical`, ipdClinicalRoutes);
app.use(`${API_PREFIX}/emr`, emrRoutes);

// ============================================================================
// ERROR HANDLING
// ============================================================================

// 404 handler
app.use(notFoundHandler);

// Global error handler
app.use(errorHandler);

// ============================================================================
// SERVER STARTUP
// ============================================================================

const startServer = async (): Promise<void> => {
    try {
        // Verify database connection
        await prisma.$connect();
        console.log('✅ Database connected');

        // Start HTTP server
        app.listen(env.PORT, () => {
            console.log(`
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║   🏥 HMS Backend Server                                    ║
║                                                            ║
║   Environment: ${env.NODE_ENV.padEnd(40)}║
║   Port:        ${String(env.PORT).padEnd(40)}║
║   API:         http://localhost:${env.PORT}/api/v1${' '.repeat(22)}║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
            `);
        });
    } catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
};

// Graceful shutdown
const gracefulShutdown = async (signal: string): Promise<void> => {
    console.log(`\n${signal} received. Shutting down gracefully...`);

    try {
        await disconnectPrisma();
        console.log('✅ Database disconnected');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error during shutdown:', error);
        process.exit(1);
    }
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Start server
// Start server only if not running in Vercel (serverless) and executed directly
if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
    startServer();
}

export default app;
