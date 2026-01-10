import type { ActionFunctionArgs } from "react-router";

const BACKEND_URL = process.env.BACKEND_API_URL || "http://localhost:4000";

// Handle POST requests
export const action = async ({ request }: ActionFunctionArgs) => {
    return handleRequest(request);
};

const handleRequest = async (request: Request) => {
    const corsHeaders = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type,ngrok-skip-browser-warning",
    };

    if (request.method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        console.log(`[SvcInteract] HIT: ${request.url}`);
        const url = new URL(request.url);

        // Forward to the backend's existing click endpoint
        // Client sees /api/svc/interact, Backend sees /api/referrals/click
        const backendUrl = `${BACKEND_URL}/api/referrals/click${url.search}`;
        console.log(`[SvcInteract] Forwarding to: ${backendUrl}`);

        const method = request.method;
        const headers = {
            "Content-Type": "application/json",
            "ngrok-skip-browser-warning": "true",
        };

        let body = null;
        if (method !== "GET" && method !== "HEAD") {
            body = await request.text();
        }

        const response = await fetch(backendUrl, {
            method,
            headers,
            body,
        });

        if (!response.ok) {
            const text = await response.text();
            console.warn(`[SvcInteract] Backend Error: ${text}`);
            return Response.json(
                { success: false, error: text },
                { status: response.status, headers: corsHeaders }
            );
        }

        const data = await response.json();
        return Response.json(data, { headers: corsHeaders });

    } catch (error) {
        console.error("[SvcInteract] Critical Error:", error);
        return Response.json(
            { success: false, error: "Network Error" },
            { status: 500, headers: corsHeaders }
        );
    }
};
