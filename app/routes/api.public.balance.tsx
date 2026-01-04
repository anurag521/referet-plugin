import type { LoaderFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
    // CORS Headers are crucial for Direct Fetch from Storefront
    const corsHeaders = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET,OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type,ngrok-skip-browser-warning",
    };

    if (request.method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        console.log(`[PublicBalance] HIT: ${request.url}`);

        // Wrapper for Backend Call
        const url = new URL(request.url);
        const query = url.searchParams;

        // --- SECURITY FIX: SIGN THE REQUEST ---
        if (!process.env.SHOPIFY_API_SECRET) {
            console.warn("SHOPIFY_API_SECRET is missing in Frontend! Using Fallback.");
        }

        // 1. Get all params as object
        const params = Object.fromEntries(query.entries());

        // 2. Remove existing signature if any (we will regen)
        delete params['signature'];
        delete params['hmac'];

        // 3. Sort keys alphabetically
        const sortedKeys = Object.keys(params).sort();

        // 4. Create string "key=valuekey=value" (No separator, consistent with backend)
        const message = sortedKeys.map(key => `${key}=${params[key]}`).join('');

        // 5. Hash it
        const crypto = await import("crypto");
        const secret = process.env.SHOPIFY_API_SECRET;
        if (!secret) {
            console.error("[PublicBalance] Missing SHOPIFY_API_SECRET");
            return Response.json({ error: "Configuration error" }, { status: 500 });
        }

        console.log(`[PublicBalance] Signing Message: "${message}"`);
        console.log(`[PublicBalance] Signing with secret length: ${secret.length}`);

        const signature = crypto
            .createHmac("sha256", secret)
            .update(message)
            .digest("hex");

        // 6. Append to Backend URL
        query.set('signature', signature);

        const backendUrl = `http://localhost:4000/api/proxy/balance?${query.toString()}`;
        console.log(`[PublicBalance] Forwarding to: ${backendUrl}`);

        const response = await fetch(backendUrl, {
            method: "GET",
            headers: { "Content-Type": "application/json" },
        });

        if (!response.ok) {
            const text = await response.text();
            console.error(`[PublicBalance] Backend Error: ${text}`);
            return Response.json(
                { points: 0, wallet: 0, error: "Backend Failed" },
                { status: response.status, headers: corsHeaders }
            );
        }

        const data = await response.json();
        console.log(`[PublicBalance] Success:`, data);

        return Response.json(data, { headers: corsHeaders });

    } catch (error) {
        console.error("[PublicBalance] Critical Error:", error);
        return Response.json(
            { points: 0, wallet: 0, error: "Critical Network Error" },
            { status: 500, headers: corsHeaders }
        );
    }
};
