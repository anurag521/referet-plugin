import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import { apiCall } from "../api.server"; // Changed from db.server

export const action = async ({ request }: ActionFunctionArgs) => {
    const { shop, session, topic } = await authenticate.webhook(request);

    console.log(`Received ${topic} webhook for ${shop}`);

    if (session) {
        // Notify backend
        // Since this is scopes update, we might want to just re-sync or log it
        // But importantly, we MUST NOT use db.server here
    }

    return new Response();
};
