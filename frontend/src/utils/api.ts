/**
 * API utility with automatic Firebase token injection
 */
import { auth } from '../config/firebase';

export const API_BASE_URL = import.meta.env.PROD
    ? 'https://api.getinterviewlens.com'
    : 'http://127.0.0.1:8000';

interface RequestOptions extends RequestInit {
    skipAuth?: boolean;
}

/**
 * Fetch wrapper that automatically adds Firebase ID token to requests
 */
export async function authenticatedFetch(
    endpoint: string,
    options: RequestOptions = {}
): Promise<Response> {
    const { skipAuth, ...fetchOptions } = options;

    // Get Firebase ID token
    let token: string | null = null;
    if (!skipAuth && auth.currentUser) {
        try {
            token = await auth.currentUser.getIdToken();
        } catch (error) {
            console.error('Error getting Firebase token:', error);
            throw new Error('Authentication failed. Please sign in again.');
        }
    }

    // Add Authorization header if we have a token
    const headers = new Headers(fetchOptions.headers);
    if (token) {
        headers.set('Authorization', `Bearer ${token}`);
    }

    // Make the request
    const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;
    const response = await fetch(url, {
        ...fetchOptions,
        headers,
    });

    // Handle 401 Unauthorized
    if (response.status === 401) {
        // Token might be expired, try to refresh
        if (auth.currentUser && !skipAuth) {
            try {
                const newToken = await auth.currentUser.getIdToken(true); // force refresh
                headers.set('Authorization', `Bearer ${newToken}`);

                // Retry the request with new token
                return fetch(`${API_BASE_URL}${endpoint}`, {
                    ...fetchOptions,
                    headers,
                });
            } catch (error) {
                console.error('Token refresh failed:', error);
                throw new Error('Session expired. Please sign in again.');
            }
        }
    }

    return response;
}

/**
 * Helper for JSON POST requests
 */
export async function postJSON(endpoint: string, data: any, options: RequestOptions = {}) {
    return authenticatedFetch(endpoint, {
        ...options,
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...options.headers,
        },
        body: JSON.stringify(data),
    });
}

/**
 * Helper for multipart form data requests
 */
export async function postFormData(endpoint: string, formData: FormData, options: RequestOptions = {}) {
    return authenticatedFetch(endpoint, {
        ...options,
        method: 'POST',
        body: formData,
        // Don't set Content-Type, let the browser set it with the boundary
    });
}

/**
 * Helper for GET requests with JSON response
 */
export async function getJSON(endpoint: string, options: RequestOptions = {}) {
    const response = await authenticatedFetch(endpoint, options);
    if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    return response.json();
}
