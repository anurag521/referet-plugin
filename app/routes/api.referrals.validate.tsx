import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";

const BACKEND_URL = process.env.BACKEND_API_URL || "http://localhost:4000";

// Handle POST requests (Widget calls this)
export const action = async ({ request }: ActionFunctionArgs) => {
    return handleRequest(request);
};

// Handle GET requests (if valid)
export const loader = async ({ request }: LoaderFunctionArgs) => {
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
        console.log(`[ReferralsValidate] HIT: ${request.url}`);
        const url = new URL(request.url);

        // Backend expects: /api/referrals/validate?shop=...
        // We are at: /api/referrals/validate
        // The widget sends 'shop' query param, which we preserve.

        const backendUrl = `${BACKEND_URL}/api/referrals/validate${url.search}`;
        console.log(`[ReferralsValidate] Forwarding to: ${backendUrl}`);

        const method = request.method;
        const headers = {
            "Content-Type": "application/json",
            "ngrok-skip-browser-warning": "true",
        };

        // Forward body if POST/PUT
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
            console.error(`[ReferralsValidate] Backend Error: ${text}`);
            return Response.json(
                { error: "Backend Failed", details: text },
                { status: response.status, headers: corsHeaders }
            );
        }

        const data = await response.json();
        return Response.json(data, { headers: corsHeaders });

    } catch (error) {
        console.error("[ReferralsValidate] Critical Error:", error);
        return Response.json(
            { error: "Critical Network Error" },
            { status: 500, headers: corsHeaders }
        );
    }
};
