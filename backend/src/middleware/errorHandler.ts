// ============================================================================
// HMS Backend - Global Error Handler Middleware
// Handles all unhandled errors and returns consistent responses
// ============================================================================

import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';
import { env } from '../config/env.js';

// Custom error class for application errors
export class AppError extends Error {
    statusCode: number;
    code: string;
    isOperational: boolean;

    constructor(
        message: string,
        statusCode: number = 500,
        code: string = 'INTERNAL_ERROR'
    ) {
        super(message);
        this.statusCode = statusCode;
        this.code = code;
        this.isOperational = true;
        Error.captureStackTrace(this, this.constructor);
    }
}

// Common error factory functions
export const NotFoundError = (resource: string = 'Resource') =>
    new AppError(`${resource} not found`, 404, 'NOT_FOUND');

export const BadRequestError = (message: string) =>
    new AppError(message, 400, 'BAD_REQUEST');

export const UnauthorizedError = (message: string = 'Authentication required') =>
    new AppError(message, 401, 'UNAUTHORIZED');

export const ForbiddenError = (message: string = 'Access denied') =>
    new AppError(message, 403, 'FORBIDDEN');

export const ConflictError = (message: string) =>
    new AppError(message, 409, 'CONFLICT');

/**
 * Global error handler middleware
 * Must be registered after all routes
 */
export const errorHandler = (
    err: Error,
    _req: Request,
    res: Response,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _next: NextFunction
): void => {
    // Log error in development
    if (env.NODE_ENV === 'development') {
        console.error('Error:', err);
    }

    // Handle AppError (our custom errors)
    if (err instanceof AppError) {
        res.status(err.statusCode).json({
            success: false,
            error: {
                code: err.code,
                message: err.message,
            },
        });
        return;
    }

    // Handle Zod validation errors
    if (err instanceof ZodError) {
        const messages = err.errors.map((e) => {
            const path = e.path.join('.');
            return path ? `${path}: ${e.message}` : e.message;
        });

        res.status(400).json({
            success: false,
            error: {
                code: 'VALIDATION_ERROR',
                message: 'Validation failed',
                details: messages,
            },
        });
        return;
    }

    // Handle Prisma errors
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
        let statusCode = 500;
        let code = 'DATABASE_ERROR';
        let message = 'Database operation failed';

        switch (err.code) {
            case 'P2002': // Unique constraint violation
                statusCode = 409;
                code = 'DUPLICATE_ENTRY';
                const fields = (err.meta?.target as string[]) || [];
                message = `A record with this ${fields.join(', ')} already exists`;
                break;

            case 'P2025': // Record not found
                statusCode = 404;
                code = 'NOT_FOUND';
                message = 'Record not found';
                break;

            case 'P2003': // Foreign key constraint failure
                statusCode = 400;
                code = 'INVALID_REFERENCE';
                message = 'Invalid reference to related record';
                break;

            case 'P2014': // Required relation violation
                statusCode = 400;
                code = 'REQUIRED_RELATION';
                message = 'Required relation is missing';
                break;
        }

        res.status(statusCode).json({
            success: false,
            error: {
                code,
                message,
                ...(env.NODE_ENV === 'development' && { prismaCode: err.code }),
            },
        });
        return;
    }

    if (err instanceof Prisma.PrismaClientValidationError) {
        res.status(400).json({
            success: false,
            error: {
                code: 'VALIDATION_ERROR',
                message: 'Invalid data provided to database',
            },
        });
        return;
    }

    // Handle syntax errors in JSON body
    if (err instanceof SyntaxError && 'body' in err) {
        res.status(400).json({
            success: false,
            error: {
                code: 'INVALID_JSON',
                message: 'Invalid JSON in request body',
            },
        });
        return;
    }

    // Default: Internal server error
    res.status(500).json({
        success: false,
        error: {
            code: 'INTERNAL_ERROR',
            message:
                env.NODE_ENV === 'production'
                    ? 'An unexpected error occurred'
                    : err.message || 'Unknown error',
        },
    });
};

/**
 * Handle 404 for unmatched routes
 */
export const notFoundHandler = (req: Request, res: Response): void => {
    res.status(404).json({
        success: false,
        error: {
            code: 'ROUTE_NOT_FOUND',
            message: `Cannot ${req.method} ${req.originalUrl}`,
        },
    });
};
