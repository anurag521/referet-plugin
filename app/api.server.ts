// app/api.server.ts
export const BACKEND_URL = process.env.BACKEND_API_URL || 'http://localhost:4000';

export async function apiCall(endpoint: string, method: string = 'GET', body?: any) {
    const url = `${BACKEND_URL}${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`;
    console.log(`📡 API Request: ${method} ${url}`);

    const options: RequestInit = {
        method,
        headers: {
            'Content-Type': 'application/json',
        },
    };

    if (body) {
        options.body = JSON.stringify(body);
    }

    try {
        const res = await fetch(url, options);
        if (!res.ok) {
            const txt = await res.text();
            throw new Error(`API Error ${res.status}: ${txt}`);
        }
        const contentType = res.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            return await res.json();
        }
        return await res.text();
    } catch (error) {
        console.error(`❌ API Call Failed (${url}):`, error);
        throw error;
    }
}
