// ============================================================================
// HMS Backend - JWT Authentication Configuration
// ============================================================================

import jwt, { SignOptions } from 'jsonwebtoken';
import { env } from './env.js';

export interface TokenPayload {
    userId: string;
    email: string;
    hospitalId: string;
    roleCode: string;
    tokenFamily?: string;
}

export interface RefreshTokenPayload {
    userId: string;
    tokenFamily: string;
}

// Generate access token (short-lived)
export const generateAccessToken = (payload: TokenPayload): string => {
    return jwt.sign(payload, env.JWT_SECRET, {
        expiresIn: env.JWT_EXPIRES_IN as SignOptions['expiresIn'],
    });
};

// Generate refresh token (long-lived)
export const generateRefreshToken = (payload: RefreshTokenPayload): string => {
    return jwt.sign(payload, env.JWT_REFRESH_SECRET, {
        expiresIn: env.JWT_REFRESH_EXPIRES_IN as SignOptions['expiresIn'],
    });
};

// Verify access token
export const verifyAccessToken = (token: string): TokenPayload | null => {
    try {
        return jwt.verify(token, env.JWT_SECRET) as TokenPayload;
    } catch {
        return null;
    }
};

// Verify refresh token
export const verifyRefreshToken = (token: string): RefreshTokenPayload | null => {
    try {
        return jwt.verify(token, env.JWT_REFRESH_SECRET) as RefreshTokenPayload;
    } catch {
        return null;
    }
};

// Generate token pair (access + refresh)
export const generateTokenPair = (
    payload: TokenPayload
): { accessToken: string; refreshToken: string; tokenFamily: string } => {
    // Create or use existing token family for refresh token rotation
    const tokenFamily = payload.tokenFamily || crypto.randomUUID();

    const accessToken = generateAccessToken({ ...payload, tokenFamily });
    const refreshToken = generateRefreshToken({
        userId: payload.userId,
        tokenFamily,
    });

    return { accessToken, refreshToken, tokenFamily };
};
