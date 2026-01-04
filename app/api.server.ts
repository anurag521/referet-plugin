// app/api.server.ts
export const BACKEND_URL = process.env.BACKEND_API_URL || 'http://localhost:4000';

type ApiCallOptions = {
    request?: Request; // To forward cookies
};

export async function apiCallRaw(endpoint: string, method: string = 'GET', body?: any, options?: ApiCallOptions) {
    const url = `${BACKEND_URL}${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`;
    console.log(`📡 API Request: ${method} ${url}`);

    const headers: HeadersInit = {
        'Content-Type': 'application/json',
    };

    if (options?.request) {
        const cookie = options.request.headers.get('Cookie');
        if (cookie) {
            headers['Cookie'] = cookie;
        }
    }

    const fetchOptions: RequestInit = {
        method,
        headers,
    };

    if (body) {
        fetchOptions.body = JSON.stringify(body);
    }

    try {
        const res = await fetch(url, fetchOptions);
        return res;
    } catch (error) {
        console.error(`❌ API Call Failed (${url}):`, error);
        throw error;
    }
}

export async function apiCall(endpoint: string, method: string = 'GET', body?: any, request?: Request) {
    const res = await apiCallRaw(endpoint, method, body, { request });

    if (!res.ok) {
        const txt = await res.text();
        throw new Error(`API Error ${res.status}: ${txt}`);
    }
    const contentType = res.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
        return await res.json();
    }
    return await res.text();
}
