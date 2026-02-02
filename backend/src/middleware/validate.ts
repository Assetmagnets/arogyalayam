// ============================================================================
// HMS Backend - Request Validation Middleware
// Zod schema validation for request body, params, and query
// ============================================================================

import { Request, Response, NextFunction } from 'express';
import { z, ZodError, ZodSchema } from 'zod';

interface ValidationSchemas {
    body?: ZodSchema;
    params?: ZodSchema;
    query?: ZodSchema;
}

/**
 * Format Zod errors into user-friendly messages
 */
const formatZodError = (error: ZodError): string => {
    return error.errors
        .map((err) => {
            const path = err.path.join('.');
            return path ? `${path}: ${err.message}` : err.message;
        })
        .join(', ');
};

/**
 * Validation middleware factory
 * Validates request body, params, and query against Zod schemas
 * 
 * @example
 * router.post('/patients', validate({ body: PatientRegistrationSchema }), createPatient);
 */
export const validate = (schemas: ValidationSchemas) => {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            // Validate body
            if (schemas.body) {
                const result = await schemas.body.safeParseAsync(req.body);
                if (!result.success) {
                    res.status(400).json({
                        success: false,
                        error: {
                            code: 'VALIDATION_ERROR',
                            message: 'Request validation failed',
                            details: formatZodError(result.error),
                        },
                    });
                    return;
                }
                req.body = result.data;
            }

            // Validate params
            if (schemas.params) {
                const result = await schemas.params.safeParseAsync(req.params);
                if (!result.success) {
                    res.status(400).json({
                        success: false,
                        error: {
                            code: 'VALIDATION_ERROR',
                            message: 'Invalid URL parameters',
                            details: formatZodError(result.error),
                        },
                    });
                    return;
                }
                req.params = result.data;
            }

            // Validate query
            if (schemas.query) {
                const result = await schemas.query.safeParseAsync(req.query);
                if (!result.success) {
                    res.status(400).json({
                        success: false,
                        error: {
                            code: 'VALIDATION_ERROR',
                            message: 'Invalid query parameters',
                            details: formatZodError(result.error),
                        },
                    });
                    return;
                }
                req.query = result.data;
            }

            next();
        } catch (error) {
            res.status(500).json({
                success: false,
                error: {
                    code: 'VALIDATION_INTERNAL_ERROR',
                    message: 'Validation failed due to internal error',
                },
            });
        }
    };
};

// Common query schemas
export const PaginationQuerySchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    sortBy: z.string().optional(),
    sortOrder: z.enum(['asc', 'desc']).default('desc'),
    search: z.string().optional(),
});

export type PaginationQuery = z.infer<typeof PaginationQuerySchema>;

// Common param schemas
export const IdParamSchema = z.object({
    id: z.string().cuid('Invalid ID format'),
});

export const HospitalIdParamSchema = z.object({
    hospitalId: z.string().cuid('Invalid hospital ID format'),
});
