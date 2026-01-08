import type { ActionFunctionArgs } from "react-router";
import { authenticate, sessionStorage } from "../shopify.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { topic, shop, session, admin, payload } = await authenticate.webhook(request);

  if (!admin) {
    // The topic check is redundant if using authenticate.webhook which validates signature
    return new Response();
  }

  const backendBase = process.env.BACKEND_API_URL || "http://localhost:4000";
  console.log(`Received Webhook ${topic} for ${shop}`);

  try {
    switch (topic) {
      case "PRODUCTS_CREATE":
        await fetch(`${backendBase}/api/products/webhook/create?shop=${shop}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        break;
      case "PRODUCTS_DELETE":
        await fetch(`${backendBase}/api/products/webhook/delete?shop=${shop}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        break;
      case "ORDERS_PAID":
        // DEBUG: Log payload details to help trace missing referrals
        console.log(`[App Webhook] Order Paid: ${payload.id}, Discounts: ${JSON.stringify(payload.discount_codes)}, Attributes: ${JSON.stringify(payload.note_attributes)}, Customer: ${payload.customer?.id}`);

        // Forward to the Referral Logic
        await fetch(`${backendBase}/webhooks/orders/paid`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-shopify-shop-domain": shop,
            "x-shopify-topic": topic
          },
          body: JSON.stringify(payload),
        });
        break;
      case "ORDERS_FULFILLED":
        // Forward to the Delayed Reward Logic
        await fetch(`${backendBase}/webhooks/orders/fulfilled`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-shopify-shop-domain": shop,
            "x-shopify-topic": topic
          },
          body: JSON.stringify(payload),
        });
        break;
      case "APP_UNINSTALLED":
        if (session) {
          await sessionStorage.deleteSession(session.id);
        }
        break;
      case "COLLECTIONS_CREATE":
        console.log(`[App Webhook] Collections Create for ${shop}`);
        await fetch(`${backendBase}/webhooks/collections/update`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-shopify-shop-domain": shop,
            "x-shopify-topic": topic
          },
          body: JSON.stringify(payload),
        });
        break;
      case "PRODUCTS_UPDATE":
        console.log(`[App Webhook] Products Update for ${shop}`);
        await fetch(`${backendBase}/webhooks/products/update`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-shopify-shop-domain": shop,
            "x-shopify-topic": topic
          },
          body: JSON.stringify(payload),
        });
        break;
      case "COLLECTIONS_UPDATE":
        console.log(`[App Webhook] Collections Update for ${shop}`);
        await fetch(`${backendBase}/webhooks/collections/update`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-shopify-shop-domain": shop,
            "x-shopify-topic": topic
          },
          body: JSON.stringify(payload),
        });
        break;
      case "COLLECTIONS_DELETE":
        console.log(`[App Webhook] Collections Delete for ${shop}`);
        await fetch(`${backendBase}/webhooks/collections/delete`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-shopify-shop-domain": shop,
            "x-shopify-topic": topic
          },
          body: JSON.stringify(payload),
        });
        break;
      case "INVENTORY_LEVELS_UPDATE":
        console.log(`[App Webhook] Inventory Update for ${shop}`);
        await fetch(`${backendBase}/webhooks/inventory/update`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-shopify-shop-domain": shop,
            "x-shopify-topic": topic
          },
          body: JSON.stringify(payload),
        });
        break;
    }
  } catch (error) {
    console.error(`Error forwarding webhook ${topic}:`, error);
    return new Response("Error forwarding webhook", { status: 500 });
  }

  return new Response();
};
