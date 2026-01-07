import type { LoaderFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
const BACKEND_URL = process.env.BACKEND_API_URL || "http://localhost:4000";
export const loader = async ({ request }: LoaderFunctionArgs) => {
    try {
        console.log(`[RewardsProxy] HIT: ${request.url}`);

        // 1. Authenticate
        const { liquid } = await authenticate.public.appProxy(request);

        if (!liquid) {
            console.warn(`[RewardsProxy] Unauthorized`);
            return Response.json({ message: "Unauthorized" }, { status: 401 });
        }

        // 2. Prepare Backend URL
        const url = new URL(request.url);
        const query = url.searchParams;
        const backendUrl = `${BACKEND_URL}/api/proxy/balance?${query.toString()}`;
        console.log(`[RewardsProxy] Forwarding to: ${backendUrl}`);

        // 3. Fetch from Backend
        const response = await fetch(backendUrl, {
            method: "GET",
            headers: { "Content-Type": "application/json" },
        });

        if (!response.ok) {
            const text = await response.text();
            console.error(`[RewardsProxy] Backend Error: ${text}`);
            return Response.json({ points: 0, wallet: 0, error: "Backend Failed" }, { status: response.status });
        }

        const data = await response.json();
        console.log(`[RewardsProxy] Success:`, data);
        return Response.json(data);

    } catch (error) {
        console.error("[RewardsProxy] Critical Error:", error);
        return Response.json({ points: 0, wallet: 0, error: "Critical Error" }, { status: 500 });
    }
};
