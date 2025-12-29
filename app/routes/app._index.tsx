import { useEffect } from "react";
import type { LoaderFunctionArgs } from "react-router";
import { useLoaderData, useNavigate } from "react-router";
import {
    Page,
    Layout,
    Text,
    Card,
    BlockStack,
    Button,
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import { apiCall } from "../api.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
    const { session } = await authenticate.admin(request);

    let merchant = { status: 'not_found', name: '', email: '' };
    try {
        merchant = await apiCall(`/api/auth/status?shop=${session.shop}`);
    } catch (e) {
        console.error("Failed to fetch merchant status", e);
    }

    return { shop: session.shop, merchant };
};

export default function Index() {
    const { shop, merchant } = useLoaderData<typeof loader>();
    const navigate = useNavigate();

    const isSignedUp = merchant.status === 'active';
    const merchantName = merchant.name || shop;

    return (
        <Page>
            <TitleBar title="Refertle Dashboard" />
            <BlockStack gap="500">
                <Layout>
                    <Layout.Section>
                        <Card>
                            <BlockStack gap="500">
                                <Text as="h2" variant="headingMd">
                                    Welcome, {merchantName}
                                </Text>
                                <Text as="p" variant="bodyMd">
                                    Your referral program is {merchant.status === 'active' ? 'active' : 'pending setup'}.
                                </Text>

                                {!isSignedUp && (
                                    <BlockStack gap="200">
                                        <Text as="p" tone="subdued">
                                            Haven't set up your account yet?
                                        </Text>
                                        <Button onClick={() => navigate("/app/signup")}>
                                            Complete Registration
                                        </Button>
                                    </BlockStack>
                                )}
                            </BlockStack>
                        </Card>

                        {isSignedUp && (
                            <Card>
                                <BlockStack gap="500">
                                    <Text as="h2" variant="headingMd">Quick Stats</Text>
                                    <Text as="p">Referrals: 0</Text>
                                    <Text as="p">Revenue: $0.00</Text>
                                </BlockStack>
                            </Card>
                        )}

                    </Layout.Section>
                </Layout>
            </BlockStack>
        </Page>
    );
}
