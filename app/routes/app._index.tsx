
import { useEffect, useState } from "react";
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
    Modal,
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import { apiCall, apiCallRaw } from "../api.server";

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
            let message = "Sync failed. Check logs.";
            if (e.message) {
                const match = e.message.match(/^API Error \d+: (.+)$/);
                if (match) {
                    try {
                        const json = JSON.parse(match[1]);
                        if (json.message) message = json.message;
                        else message = match[1];
                    } catch (err) {
                        message = match[1];
                    }
                } else {
                    message = e.message;
                }
            }
            return { success: false, message };
        }
    }


    if (intent === "logout") {
        let headers = new Headers();
        try {
            const res = await apiCallRaw(`/api/auth/logout`, "POST", undefined, { request });
            // Forward the Set-Cookie header to clear it in the browser
            const setCookie = res.headers.get('Set-Cookie');
            if (setCookie) {
                headers.append('Set-Cookie', setCookie);
            }
        } catch (e) {
            console.error("Logout failed", e);
        }
        // Redirect to login page with the clear-cookie header
        throw redirect("/app/login", { headers });
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

    const [showSyncModal, setShowSyncModal] = useState(false);

    useEffect(() => {
        if (syncMessage && !syncSuccess) {
            setShowSyncModal(true);
        }
    }, [syncMessage, syncSuccess]);

    const handleCloseModal = () => setShowSyncModal(false);

    return (
        <Page>
            <TitleBar title="Refertle Dashboard" />
            <BlockStack gap="500">
                <Layout>
                    <Layout.Section>
                        <Card>
                            <BlockStack gap="500">
                                <div style={{ textAlign: 'center', marginBottom: '15px' }}>
                                    <img src="/logo.png" alt="Refertle Logo" style={{ maxHeight: '60px', width: 'auto' }} />
                                </div>
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
                                        <InlineStack gap="300">
                                            <Button onClick={() => navigate("/app/login")}>
                                                Login to Dashboard
                                            </Button>
                                            <Button onClick={() => window.open("https://refertle.vercel.app/login", "_blank")}>
                                                Login via Web
                                            </Button>
                                        </InlineStack>
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

                                            <Button onClick={() => window.open("https://refertle.vercel.app/", "_blank")}>
                                                Go to Refertle
                                            </Button>
                                        </InlineStack>
                                        <Modal
                                            open={showSyncModal}
                                            onClose={handleCloseModal}
                                            title="Sync Error"
                                            primaryAction={{
                                                content: 'Close',
                                                onAction: handleCloseModal,
                                            }}
                                        >
                                            <Modal.Section>
                                                <Banner tone="critical">
                                                    <p>{syncMessage}</p>
                                                </Banner>
                                            </Modal.Section>
                                        </Modal>

                                        {syncMessage && syncSuccess && (
                                            <Banner tone="success">
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
