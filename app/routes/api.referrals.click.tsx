import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";

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
        console.log(`[ReferralsClick] HIT: ${request.url}`);
        const url = new URL(request.url);

        // Backend expects: /api/referrals/click?shop=...
        const backendUrl = `${BACKEND_URL}/api/referrals/click${url.search}`;
        console.log(`[ReferralsClick] Forwarding to: ${backendUrl}`);

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
            // Click tracking errors are often ignored by frontend, but good to log
            const text = await response.text();
            console.warn(`[ReferralsClick] Backend Error: ${text}`);
            return Response.json(
                { success: false, error: text },
                { status: response.status, headers: corsHeaders }
            );
        }

        const data = await response.json();
        return Response.json(data, { headers: corsHeaders });

    } catch (error) {
        console.error("[ReferralsClick] Critical Error:", error);
        return Response.json(
            { success: false, error: "Network Error" },
            { status: 500, headers: corsHeaders }
        );
    }
};
