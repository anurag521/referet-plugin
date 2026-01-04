import type { LoaderFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
    console.log(`[GlobalSplat] CAUGHT: ${request.url}`);

    // Return debug info so we can see it in the browser
    return Response.json({
        message: "Global Catch-All Route Hit",
        url: request.url,
        note: "The specific route definition is seemingly not matching.",
        path: new URL(request.url).pathname
    });
};
