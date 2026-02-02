// ============================================================================
// HMS Backend - Audit Logging Middleware
// Logs all significant actions for compliance and debugging
// ============================================================================

import { Request, Response, NextFunction } from 'express';
import { prisma as _prisma } from '../config/database.js';

// Actions that should be logged
const LOGGED_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE'];

// Routes that should not be logged (e.g., health checks)
const EXCLUDED_PATHS = ['/health', '/api/health', '/api/v1/health'];

interface AuditLogEntry {
    userId: string | null;
    action: string;
    method: string;
    path: string;
    statusCode: number;
    ipAddress: string;
    userAgent: string;
    requestBody?: unknown;
    responseTime: number;
    hospitalId: string | null;
}

/**
 * Audit logging middleware
 * Logs requests to significant endpoints
 */
export const auditLog = (
    req: Request,
    res: Response,
    next: NextFunction
): void => {
    // Skip excluded paths
    if (EXCLUDED_PATHS.includes(req.path)) {
        next();
        return;
    }

    // Only log significant methods
    if (!LOGGED_METHODS.includes(req.method)) {
        next();
        return;
    }

    const startTime = Date.now();

    // Store original end function
    const originalEnd = res.end;
    const originalJson = res.json;

    // Override json to allow end to be called with proper response tracking
    res.json = function (body: unknown) {
        return originalJson.call(this, body);
    };

    res.end = function (this: Response, ...args: unknown[]) {
        const responseTime = Date.now() - startTime;

        // Create audit log entry
        const logEntry: AuditLogEntry = {
            userId: req.user?.userId || null,
            action: `${req.method} ${req.route?.path || req.path}`,
            method: req.method,
            path: req.originalUrl,
            statusCode: res.statusCode,
            ipAddress:
                (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
                req.socket.remoteAddress ||
                'unknown',
            userAgent: req.headers['user-agent'] || 'unknown',
            requestBody: sanitizeBody(req.body),
            responseTime,
            hospitalId: req.user?.hospitalId || null,
        };

        // Log asynchronously (don't block response)
        void logAuditEntry(logEntry);

        return originalEnd.apply(this, args as Parameters<typeof originalEnd>);
    };

    next();
};

/**
 * Sanitize request body for logging
 * Removes sensitive fields like passwords
 */
function sanitizeBody(body: unknown): unknown {
    if (!body || typeof body !== 'object') {
        return body;
    }

    const sensitiveFields = [
        'password',
        'passwordHash',
        'token',
        'refreshToken',
        'aadhaarNumber',
        'panNumber',
    ];

    const sanitized = { ...body } as Record<string, unknown>;

    for (const field of sensitiveFields) {
        if (field in sanitized) {
            sanitized[field] = '[REDACTED]';
        }
    }

    return sanitized;
}

/**
 * Log audit entry to database or console
 * In production, this should go to a proper audit log table
 */
async function logAuditEntry(entry: AuditLogEntry): Promise<void> {
    try {
        // For now, log to console
        // TODO: Create AuditLog table and store entries
        console.log(
            `[AUDIT] ${entry.action} by ${entry.userId || 'anonymous'} - ${entry.statusCode} (${entry.responseTime}ms)`
        );

        // Future: Store in database
        // await prisma.auditLog.create({ data: entry });
    } catch (error) {
        console.error('Failed to log audit entry:', error);
    }
}

/**
 * Request ID middleware
 * Adds unique request ID for tracing
 */
export const requestId = (
    req: Request,
    res: Response,
    next: NextFunction
): void => {
    const id = crypto.randomUUID();
    req.headers['x-request-id'] = id;
    res.setHeader('x-request-id', id);
    next();
};
