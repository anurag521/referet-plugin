
import { useEffect } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { useLoaderData, useNavigate, useFetcher, redirect } from "react-router";
import {
    Page,
    Layout,
    Text,
    Card,
    BlockStack,
    Button,
    Banner,
    InlineStack,
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import { apiCall } from "../api.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
    const { session } = await authenticate.admin(request);

    let merchant = { status: 'not_found', name: '', email: '', isAuthenticated: false };
    try {
        // Pass request to forward cookies
        merchant = await apiCall(`/api/auth/status?shop=${session.shop}`, 'GET', undefined, request);
    } catch (e) {
        console.error("Failed to fetch merchant status", e);
    }

    return { shop: session.shop, merchant };
};

export const action = async ({ request }: ActionFunctionArgs) => {
    const { session } = await authenticate.admin(request);
    const formData = await request.formData();
    const intent = formData.get("intent");

    if (intent === "sync_products") {
        try {
            console.log("Triggering Product Sync for", session.shop);
            await apiCall(`/api/products/sync?shop=${session.shop}`, "POST", undefined, request);
            return { success: true, message: "Products synced successfully!" };
        } catch (e: any) {
            console.error("Sync failed", e);
            return { success: false, message: "Sync failed. Check logs." };
        }
    }

    if (intent === "logout") {
        try {
            await apiCall(`/api/auth/logout`, "POST", undefined, request);
        } catch (e) {
            console.error("Logout failed", e);
        }
        // Redirect to login page
        throw redirect("/app/login");
    }
    return null;
};

export default function Index() {
    const { shop, merchant } = useLoaderData<typeof loader>();
    const navigate = useNavigate();
    const fetcher = useFetcher<typeof action>();

    const isSignedUp = merchant.status === 'active';
    const isAuthenticated = merchant.isAuthenticated;
    const merchantName = merchant.name || shop;

    const isSyncing = fetcher.state === "submitting" && fetcher.formData?.get("intent") === "sync_products";
    const syncMessage = fetcher.data?.message;
    const syncSuccess = fetcher.data?.success;

    return (
        <Page>
            <TitleBar title="Refertle Dashboard" />
            <BlockStack gap="500">
                <Layout>
                    <Layout.Section>
                        <Card>
                            <BlockStack gap="500">
                                <Text as="h2" variant="headingMd">
                                    Welcome{isAuthenticated ? `, ${merchantName}` : ''}
                                </Text>
                                <Text as="p" variant="bodyMd">
                                    Your referral program is {merchant.status === 'active' ? 'active' : 'pending setup'}.
                                </Text>

                                {!isSignedUp && (
                                    <BlockStack gap="200">
                                        <Text as="p" tone="subdued">
                                            Account setup required. Valid options:
                                        </Text>
                                        <InlineStack gap="300">
                                            <Button onClick={() => navigate("/app/login")}>
                                                Login
                                            </Button>
                                            <Button variant="primary" onClick={() => navigate("/app/signup")}>
                                                Signup
                                            </Button>
                                        </InlineStack>
                                    </BlockStack>
                                )}

                                {isSignedUp && !isAuthenticated && (
                                    <BlockStack gap="200">
                                        <Banner tone="warning">
                                            <p>You are not logged in. Please login to view your dashboard.</p>
                                        </Banner>
                                        <Button onClick={() => navigate("/app/login")}>
                                            Login to Dashboard
                                        </Button>
                                    </BlockStack>
                                )}

                                {isAuthenticated && (
                                    <BlockStack gap="400">
                                        <InlineStack align="start" gap="400">
                                            <fetcher.Form method="post">
                                                <input type="hidden" name="intent" value="sync_products" />
                                                <Button submit loading={isSyncing}>
                                                    Sync Products
                                                </Button>
                                            </fetcher.Form>

                                            <fetcher.Form method="post">
                                                <input type="hidden" name="intent" value="logout" />
                                                <Button submit variant="tertiary" tone="critical">
                                                    Logout
                                                </Button>
                                            </fetcher.Form>
                                        </InlineStack>
                                        {syncMessage && (
                                            <Banner tone={syncSuccess ? "success" : "critical"}>
                                                <p>{syncMessage}</p>
                                            </Banner>
                                        )}
                                    </BlockStack>
                                )}

                            </BlockStack>
                        </Card>

                        
                    </Layout.Section>
                </Layout>
            </BlockStack>
        </Page>
    );
}
