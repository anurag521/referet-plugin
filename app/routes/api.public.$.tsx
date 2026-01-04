import { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";

const BACKEND_URL = process.env.BACKEND_API_URL || "http://localhost:4000";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, ngrok-skip-browser-warning",
    "Access-Control-Allow-Credentials": "true"
};

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
    const url = new URL(request.url);
    const path = params["*"]; // The splat param
    const targetUrl = `${BACKEND_URL}/api/public/${path}${url.search}`;

    console.log(`[Proxy-Loader] Incoming GET request to: ${targetUrl}`);
    console.log(`[Proxy-Loader] Headers:`, JSON.stringify(Object.fromEntries(request.headers)));

    try {
        if (request.method === "OPTIONS") {
            return new Response(null, { status: 204, headers: corsHeaders });
        }

        const response = await fetch(targetUrl, {
            method: "GET",
            headers: request.headers,
        });

        console.log(`[Proxy-Loader] Backend responded with status: ${response.status}`);

        // Forward headers and add CORS
        const headers = new Headers(response.headers);
        Object.entries(corsHeaders).forEach(([k, v]) => headers.set(k, v));

        return new Response(response.body, {
            status: response.status,
            headers: headers,
        });
    } catch (error: any) {
        console.error("[Proxy-Loader] Error fetching backend:", error);
        return new Response(JSON.stringify({ error: "Backend Error", details: error.message, stack: error.stack }), {
            status: 502,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
    }
};

export const action = async ({ request, params }: ActionFunctionArgs) => {
    // Handle Preflight Options
    if (request.method === "OPTIONS") {
        return new Response(null, { status: 204, headers: corsHeaders });
    }

    const url = new URL(request.url);
    const path = params["*"];
    const targetUrl = `${BACKEND_URL}/api/public/${path}${url.search}`;

    console.log(`[Proxy-Action] Incoming ${request.method} request to: ${targetUrl}`);
    console.log(`[Proxy-Action] Headers:`, JSON.stringify(Object.fromEntries(request.headers)));

    let body;
    try {
        body = await request.text();
        console.log(`[Proxy-Action] Body Payload:`, body);
    } catch (e) {
        console.warn(`[Proxy-Action] Error reading body:`, e);
        body = null;
    }

    try {
        const response = await fetch(targetUrl, {
            method: request.method,
            headers: request.headers,
            body: body, // Send the text body forward
            // @ts-ignore - undici fetch types vs web types
            duplex: 'half' // Good practice even with string body in some contexts, but string usually safe
        });

        console.log(`[Proxy-Action] Backend responded with status: ${response.status}`);

        const headers = new Headers(response.headers);
        Object.entries(corsHeaders).forEach(([k, v]) => headers.set(k, v));

        return new Response(response.body, {
            status: response.status,
            headers: headers,
        });
    } catch (error: any) {
        console.error("[Proxy-Action] Error fetching backend:", error);
        return new Response(JSON.stringify({ error: "Backend Error", details: error.message, stack: error.stack }), {
            status: 502,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
    }
};
