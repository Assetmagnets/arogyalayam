// ============================================================================
// HMS Frontend - Authentication Context
// Manages authentication state, tokens, and user info
// ============================================================================

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';

interface User {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    hospitalId: string;
    roleCode: string;
}

interface AuthContextType {
    user: User | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    login: (email: string, password: string) => Promise<void>;
    logout: () => Promise<void>;
    refreshTokens: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Token storage keys
const ACCESS_TOKEN_KEY = 'hms_access_token';
const REFRESH_TOKEN_KEY = 'hms_refresh_token';
const USER_KEY = 'hms_user';

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Initialize auth state from localStorage
    useEffect(() => {
        const initAuth = async () => {
            try {
                const storedUser = localStorage.getItem(USER_KEY);
                const accessToken = localStorage.getItem(ACCESS_TOKEN_KEY);

                if (storedUser && accessToken) {
                    setUser(JSON.parse(storedUser));
                }
            } catch (error) {
                // Clear invalid tokens
                clearTokens();
            } finally {
                setIsLoading(false);
            }
        };

        initAuth();
    }, []);

    const clearTokens = () => {
        localStorage.removeItem(ACCESS_TOKEN_KEY);
        localStorage.removeItem(REFRESH_TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
        setUser(null);
    };

    const login = useCallback(async (email: string, password: string) => {
        const response = await api.post<{
            user: User;
            accessToken: string;
            refreshToken: string;
        }>('/auth/login', { email, password });

        const { user: userData, accessToken, refreshToken } = response.data;

        // Store tokens
        localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
        localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
        localStorage.setItem(USER_KEY, JSON.stringify(userData));

        setUser(userData);
    }, []);

    const logout = useCallback(async () => {
        try {
            await api.post('/auth/logout');
        } catch {
            // Ignore errors - we're logging out anyway
        } finally {
            clearTokens();
        }
    }, []);

    const refreshTokens = useCallback(async () => {
        const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);

        if (!refreshToken) {
            throw new Error('No refresh token');
        }

        const response = await api.post<{
            accessToken: string;
            refreshToken: string;
        }>('/auth/refresh', { refreshToken });

        localStorage.setItem(ACCESS_TOKEN_KEY, response.data.accessToken);
        localStorage.setItem(REFRESH_TOKEN_KEY, response.data.refreshToken);
    }, []);

    const value: AuthContextType = {
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
        refreshTokens,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}

// Get access token for API calls
export function getAccessToken(): string | null {
    return localStorage.getItem(ACCESS_TOKEN_KEY);
}
