// ============================================================================
// HMS Frontend - API Client
// Axios-like fetch wrapper with auth interceptor
// ============================================================================

import { getAccessToken } from '@/contexts/AuthContext';

const API_BASE_URL = '/api/v1';

interface ApiResponse<T> {
    success: boolean;
    data: T;
    error?: {
        code: string;
        message: string;
        details?: unknown;
    };
    meta?: {
        page?: number;
        limit?: number;
        total?: number;
        totalPages?: number;
    };
}

interface RequestOptions {
    headers?: Record<string, string>;
    params?: Record<string, string | number | boolean | undefined>;
}

class ApiClient {
    private baseUrl: string;

    constructor(baseUrl: string) {
        this.baseUrl = baseUrl;
    }

    private async request<T>(
        method: string,
        path: string,
        data?: unknown,
        options: RequestOptions = {}
    ): Promise<ApiResponse<T>> {
        const url = new URL(`${this.baseUrl}${path}`, window.location.origin);

        // Add query params
        if (options.params) {
            Object.entries(options.params).forEach(([key, value]) => {
                if (value !== undefined) {
                    url.searchParams.append(key, String(value));
                }
            });
        }

        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            ...options.headers,
        };

        // Add auth token
        const token = getAccessToken();
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch(url.toString(), {
            method,
            headers,
            body: data ? JSON.stringify(data) : undefined,
        });

        let json;
        try {
            const text = await response.text();
            json = text ? JSON.parse(text) : {};
        } catch {
            json = {};
        }

        if (!response.ok) {
            if (response.status === 401) {
                // Token is invalid or expired — clear auth and redirect to login
                localStorage.removeItem('hms_access_token');
                localStorage.removeItem('hms_refresh_token');
                localStorage.removeItem('hms_user');
                if (window.location.pathname !== '/login') {
                    window.location.href = '/login';
                }
                const error = new Error('Session expired. Please login again.') as Error & {
                    code?: string;
                    status?: number;
                };
                error.code = 'UNAUTHORIZED';
                error.status = 401;
                throw error;
            }
            if (response.status === 429) {
                const error = new Error('Too many requests. Please wait a moment and try again.') as Error & {
                    code?: string;
                    status?: number;
                };
                error.code = 'RATE_LIMITED';
                error.status = 429;
                throw error;
            }
            const error = new Error(json.error?.message || 'Request failed') as Error & {
                code?: string;
                status?: number;
            };
            error.code = json.error?.code;
            error.status = response.status;
            throw error;
        }

        return json;
    }

    async get<T>(path: string, options: RequestOptions = {}): Promise<ApiResponse<T>> {
        return this.request<T>('GET', path, undefined, options);
    }

    async post<T>(path: string, data?: unknown, options: RequestOptions = {}): Promise<ApiResponse<T>> {
        return this.request<T>('POST', path, data, options);
    }

    async put<T>(path: string, data?: unknown, options: RequestOptions = {}): Promise<ApiResponse<T>> {
        return this.request<T>('PUT', path, data, options);
    }

    async patch<T>(path: string, data?: unknown, options: RequestOptions = {}): Promise<ApiResponse<T>> {
        return this.request<T>('PATCH', path, data, options);
    }

    async delete<T>(path: string, options: RequestOptions = {}): Promise<ApiResponse<T>> {
        return this.request<T>('DELETE', path, undefined, options);
    }
}

export const api = new ApiClient(API_BASE_URL);
