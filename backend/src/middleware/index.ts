// ============================================================================
// HMS Backend - Middleware Exports
// ============================================================================

export { authenticate, optionalAuth } from './authenticate.js';
export {
    requireRole,
    requirePermission,
    requireHospital,
    clearPermissionCache,
} from './authorize.js';
export {
    validate,
    PaginationQuerySchema,
    IdParamSchema,
    HospitalIdParamSchema,
    type PaginationQuery,
} from './validate.js';
export {
    errorHandler,
    notFoundHandler,
    AppError,
    NotFoundError,
    BadRequestError,
    UnauthorizedError,
    ForbiddenError,
    ConflictError,
} from './errorHandler.js';
export { auditLog, requestId } from './auditLog.js';
