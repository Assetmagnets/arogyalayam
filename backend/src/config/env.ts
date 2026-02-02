// ============================================================================
// HMS Backend - Environment Configuration
// Validates and exports environment variables with Zod
// ============================================================================

import { z } from 'zod';
import dotenv from 'dotenv';

// Load .env file
dotenv.config();

// Environment schema with validation
const envSchema = z.object({
    // Node
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    PORT: z.coerce.number().default(3001),

    // Database
    DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

    // JWT
    JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
    JWT_EXPIRES_IN: z.string().default('15m'),
    JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 characters'),
    JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),

    // Hospital
    DEFAULT_HOSPITAL_ID: z.string().optional(),
    DEFAULT_HOSPITAL_CODE: z.string().default('HMS'),

    // Rate Limiting
    RATE_LIMIT_WINDOW_MS: z.coerce.number().default(900000), // 15 minutes
    RATE_LIMIT_MAX: z.coerce.number().default(100),

    // CORS
    CORS_ORIGIN: z.string().default('http://localhost:5173'),

    // Logging
    LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
});

// Parse and validate environment
const parseEnv = () => {
    const result = envSchema.safeParse(process.env);

    if (!result.success) {
        console.error('❌ Environment validation failed:');
        console.error(result.error.flatten().fieldErrors);
        process.exit(1);
    }

    return result.data;
};

export const env = parseEnv();

// Type export for use in other files
export type Env = z.infer<typeof envSchema>;
