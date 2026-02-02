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

        const json = await response.json();

        if (!response.ok) {
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
