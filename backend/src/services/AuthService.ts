// ============================================================================
// HMS Backend - Authentication Service
// Handles user registration, login, token refresh, and password management
// ============================================================================

import bcrypt from 'bcryptjs';
import { PrismaClient, User, UserStatus } from '@prisma/client';
import {
    generateTokenPair,
    verifyRefreshToken,
    TokenPayload,
} from '../config/auth.js';
import { AppError } from '../middleware/errorHandler.js';

const SALT_ROUNDS = 12;
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MINUTES = 30;

interface LoginResult {
    user: {
        id: string;
        email: string;
        firstName: string;
        lastName: string;
        hospitalId: string;
        roleCode: string;
    };
    accessToken: string;
    refreshToken: string;
}

interface RegisterInput {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phone?: string;
    hospitalId: string;
    roleId: string;
}

export class AuthService {
    private prisma: PrismaClient;

    constructor(prisma: PrismaClient) {
        this.prisma = prisma;
    }

    /**
     * Register a new user
     */
    async register(
        input: RegisterInput,
        createdBy: string
    ): Promise<{ user: User; message: string }> {
        // Check if email already exists
        const existingUser = await this.prisma.user.findUnique({
            where: { email: input.email.toLowerCase() },
        });

        if (existingUser) {
            throw new AppError('Email already registered', 409, 'EMAIL_EXISTS');
        }

        // Verify hospital exists
        const hospital = await this.prisma.hospital.findUnique({
            where: { id: input.hospitalId },
        });

        if (!hospital) {
            throw new AppError('Invalid hospital', 400, 'INVALID_HOSPITAL');
        }

        // Verify role exists
        const role = await this.prisma.role.findUnique({
            where: { id: input.roleId },
        });

        if (!role) {
            throw new AppError('Invalid role', 400, 'INVALID_ROLE');
        }

        // Hash password
        const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);

        // Create user
        const user = await this.prisma.user.create({
            data: {
                email: input.email.toLowerCase(),
                passwordHash,
                firstName: input.firstName,
                lastName: input.lastName,
                phone: input.phone,
                hospitalId: input.hospitalId,
                roleId: input.roleId,
                status: UserStatus.PENDING_VERIFICATION,
                createdBy,
                updatedBy: createdBy,
            },
        });

        return {
            user,
            message: 'User registered successfully. Awaiting verification.',
        };
    }

    /**
     * Authenticate user and generate tokens
     */
    async login(email: string, password: string): Promise<LoginResult> {
        // Find user by email
        const user = await this.prisma.user.findUnique({
            where: { email: email.toLowerCase() },
            include: {
                role: true,
            },
        });

        if (!user || user.deletedAt) {
            throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
        }

        // Check if account is locked
        if (user.lockedUntil && user.lockedUntil > new Date()) {
            const minutesRemaining = Math.ceil(
                (user.lockedUntil.getTime() - Date.now()) / (1000 * 60)
            );
            throw new AppError(
                `Account locked. Try again in ${minutesRemaining} minutes.`,
                423,
                'ACCOUNT_LOCKED'
            );
        }

        // Check account status
        if (user.status === UserStatus.SUSPENDED) {
            throw new AppError(
                'Account suspended. Contact administrator.',
                403,
                'ACCOUNT_SUSPENDED'
            );
        }

        if (user.status === UserStatus.INACTIVE) {
            throw new AppError(
                'Account inactive. Contact administrator.',
                403,
                'ACCOUNT_INACTIVE'
            );
        }

        // Verify password
        const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

        if (!isPasswordValid) {
            // Increment failed login count
            const failedCount = user.failedLoginCount + 1;

            const updateData: {
                failedLoginCount: number;
                lockedUntil?: Date | null;
            } = {
                failedLoginCount: failedCount,
            };

            // Lock account if too many failed attempts
            if (failedCount >= MAX_FAILED_ATTEMPTS) {
                updateData.lockedUntil = new Date(
                    Date.now() + LOCKOUT_DURATION_MINUTES * 60 * 1000
                );
            }

            await this.prisma.user.update({
                where: { id: user.id },
                data: updateData,
            });

            throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
        }

        // Generate token pair
        const tokenPayload: TokenPayload = {
            userId: user.id,
            email: user.email,
            hospitalId: user.hospitalId,
            roleCode: user.role.code,
        };

        const { accessToken, refreshToken, tokenFamily } = generateTokenPair(tokenPayload);

        // Hash refresh token and store
        const refreshTokenHash = await bcrypt.hash(refreshToken, SALT_ROUNDS);

        // Update user: reset failed attempts, store refresh token, update last login
        await this.prisma.user.update({
            where: { id: user.id },
            data: {
                failedLoginCount: 0,
                lockedUntil: null,
                lastLoginAt: new Date(),
                refreshTokenHash,
                tokenFamily,
            },
        });

        return {
            user: {
                id: user.id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                hospitalId: user.hospitalId,
                roleCode: user.role.code,
            },
            accessToken,
            refreshToken,
        };
    }

    /**
     * Refresh access token using refresh token (with rotation)
     */
    async refreshToken(refreshToken: string): Promise<{
        accessToken: string;
        refreshToken: string;
    }> {
        // Verify refresh token
        const payload = verifyRefreshToken(refreshToken);

        if (!payload) {
            throw new AppError('Invalid refresh token', 401, 'INVALID_REFRESH_TOKEN');
        }

        // Find user
        const user = await this.prisma.user.findUnique({
            where: { id: payload.userId },
            include: { role: true },
        });

        if (!user || user.deletedAt) {
            throw new AppError('User not found', 401, 'USER_NOT_FOUND');
        }

        // Verify token family matches (detect token reuse)
        if (user.tokenFamily !== payload.tokenFamily) {
            // Potential token theft - invalidate all tokens
            await this.prisma.user.update({
                where: { id: user.id },
                data: {
                    refreshTokenHash: null,
                    tokenFamily: null,
                },
            });

            throw new AppError(
                'Security alert: Token reuse detected. Please login again.',
                401,
                'TOKEN_THEFT_DETECTED'
            );
        }

        // Verify refresh token hash
        if (!user.refreshTokenHash) {
            throw new AppError('Session expired. Please login again.', 401, 'SESSION_EXPIRED');
        }

        const isValidHash = await bcrypt.compare(refreshToken, user.refreshTokenHash);
        if (!isValidHash) {
            throw new AppError('Invalid refresh token', 401, 'INVALID_REFRESH_TOKEN');
        }

        // Generate new token pair (rotation)
        const tokenPayload: TokenPayload = {
            userId: user.id,
            email: user.email,
            hospitalId: user.hospitalId,
            roleCode: user.role.code,
            tokenFamily: payload.tokenFamily,
        };

        const tokens = generateTokenPair(tokenPayload);

        // Update refresh token hash
        const newRefreshTokenHash = await bcrypt.hash(tokens.refreshToken, SALT_ROUNDS);

        await this.prisma.user.update({
            where: { id: user.id },
            data: { refreshTokenHash: newRefreshTokenHash },
        });

        return {
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
        };
    }

    /**
     * Logout user (invalidate refresh token)
     */
    async logout(userId: string): Promise<void> {
        await this.prisma.user.update({
            where: { id: userId },
            data: {
                refreshTokenHash: null,
                tokenFamily: null,
            },
        });
    }

    /**
     * Change password
     */
    async changePassword(
        userId: string,
        currentPassword: string,
        newPassword: string
    ): Promise<void> {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
        });

        if (!user) {
            throw new AppError('User not found', 404, 'USER_NOT_FOUND');
        }

        // Verify current password
        const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
        if (!isValid) {
            throw new AppError('Current password is incorrect', 400, 'INVALID_PASSWORD');
        }

        // Hash new password
        const newPasswordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);

        // Update password and invalidate all tokens
        await this.prisma.user.update({
            where: { id: userId },
            data: {
                passwordHash: newPasswordHash,
                refreshTokenHash: null,
                tokenFamily: null,
                updatedBy: userId,
            },
        });
    }

    /**
     * Get user by ID
     */
    async getUserById(userId: string): Promise<User | null> {
        return this.prisma.user.findFirst({
            where: {
                id: userId,
                deletedAt: null,
            },
        });
    }
}

// Factory function
export function createAuthService(prisma: PrismaClient): AuthService {
    return new AuthService(prisma);
}

export default AuthService;
