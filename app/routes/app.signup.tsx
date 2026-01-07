import { useState, useEffect } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { Form, useActionData, useLoaderData, useSubmit, redirect, useNavigation, useNavigate } from "react-router";
import {
    Page,
    Layout,
    Text,
    Card,
    Button,
    BlockStack,
    TextField,
    Banner,
    Modal,
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import { apiCall, apiCallRaw } from "../api.server";


export const loader = async ({ request }: LoaderFunctionArgs) => {
    const { session } = await authenticate.admin(request);

    let isAuthenticated = false;
    try {
        const statusRes = await apiCallRaw(`/api/auth/status?shop=${session.shop}`, 'GET', undefined, { request });
        if (statusRes.ok) {
            const status = await statusRes.json();
            isAuthenticated = status.isAuthenticated;
        }
    } catch (e) { }

    return { shop: session.shop, isAuthenticated };
};

export const action = async ({ request }: ActionFunctionArgs) => {
    const { session } = await authenticate.admin(request);
    const formData = await request.formData();

    const name = formData.get("name") as string;
    const email = formData.get("email") as string;
    const phone = formData.get("phone") as string;
    const password = formData.get("password") as string;

    if (!name || !email || !password) {
        return { error: "Name, Email and Password are required." };
    }

    try {
        // 1. Call Backend API to Create Merchant
        await apiCall("/api/auth/merchant/signup", "POST", {
            name,
            email,
            phone,
            password,
            shop_domain: session.shop,
        }, request); // Wrapper handles standard requests

        // 2. Auto-Login to get the session cookie
        const loginRes = await apiCallRaw("/api/auth/login", "POST", {
            email,
            password
        });

        if (!loginRes.ok) {
            console.error("Auto-login failed after signup");
            return redirect("/app?login_required=true");
        }

        // 3. Forward the Set-Cookie header
        const setCookie = loginRes.headers.get('set-cookie');
        const headers: HeadersInit = {};
        if (setCookie) {
            headers['Set-Cookie'] = setCookie;
        }

        return redirect("/app", { headers });

    } catch (error: any) {
        console.error("Signup Failed", error);
        let message = error.message || "Registration failed. Please try again.";

        // Attempt to parse out the "API Error 500: {...}" stuff
        const match = message.match(/^API Error \d+: (.+)$/);
        if (match) {
            try {
                const json = JSON.parse(match[1]);
                // If the backend sent a nice {"message": "..."} use that
                if (json.message) message = json.message;
                else message = match[1]; // Fallback to raw text body
            } catch (e) {
                // Not JSON, just use the text body
                message = match[1];
            }
        }
        return { error: message };
    }
};

export default function Signup() {
    const { shop, isAuthenticated } = useLoaderData<typeof loader>();
    const actionData = useActionData<typeof action>();
    const submit = useSubmit();
    const nav = useNavigation();
    const navigate = useNavigate();

    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [phone, setPhone] = useState("");
    const [password, setPassword] = useState("");

    useEffect(() => {
        if (isAuthenticated) {
            navigate("/app");
        }
    }, [isAuthenticated, navigate]);

    const [showErrorModal, setShowErrorModal] = useState(false);

    useEffect(() => {
        if (actionData?.error) {
            setShowErrorModal(true);
        }
    }, [actionData]);

    const handleCloseModal = () => setShowErrorModal(false);

    const isSubmitting = nav.state === "submitting";

    const handleSubmit = () => {
        submit({ name, email, phone, password }, { method: "post" });
    };

    if (isAuthenticated) {
        return (
            <Page>
                <Layout>
                    <Card>
                        <BlockStack gap="400" align="center">
                            <Text as="h2" variant="headingMd">Redirecting to Dashboard...</Text>
                        </BlockStack>
                    </Card>
                </Layout>
            </Page>
        );
    }

    return (
        <Page title="Welcome to Refertle">
            <BlockStack gap="500">
                <Layout>
                    <Layout.Section>
                        <Card>
                            <BlockStack gap="500">
                                <div style={{ textAlign: 'center', marginBottom: '15px' }}>
                                    <img src="/logo.png" alt="Refertle Logo" style={{ maxHeight: '80px', width: 'auto' }} />
                                </div>
                                <Text as="h2" variant="headingMd">
                                    Complete your registration
                                </Text>
                                <Text as="p" variant="bodyMd">
                                    Set up your merchant account for shop: <strong>{shop}</strong>
                                </Text>

                                <Modal
                                    open={showErrorModal}
                                    onClose={handleCloseModal}
                                    title="Registration Error"
                                    primaryAction={{
                                        content: 'Close',
                                        onAction: handleCloseModal,
                                    }}
                                >
                                    <Modal.Section>
                                        <Banner tone="critical">
                                            <p>{actionData?.error}</p>
                                        </Banner>
                                    </Modal.Section>
                                </Modal>

                                <Form method="post">
                                    <BlockStack gap="400">
                                        <TextField
                                            label="Merchant Name"
                                            type="text"
                                            name="name"
                                            value={name}
                                            onChange={setName}
                                            autoComplete="name"
                                            disabled={isSubmitting}
                                        />
                                        <TextField
                                            label="Email"
                                            type="email"
                                            name="email"
                                            value={email}
                                            onChange={setEmail}
                                            autoComplete="email"
                                            disabled={isSubmitting}
                                        />
                                        <TextField
                                            label="Phone (Optional)"
                                            type="tel"
                                            name="phone"
                                            value={phone}
                                            onChange={setPhone}
                                            autoComplete="tel"
                                            disabled={isSubmitting}
                                        />
                                        <TextField
                                            label="Password"
                                            type="password"
                                            name="password"
                                            value={password}
                                            onChange={setPassword}
                                            autoComplete="new-password"
                                            helpText="Create a password for the Refertle Merchant Portal."
                                            disabled={isSubmitting}
                                        />
                                        <Button
                                            onClick={handleSubmit}
                                            variant="primary"
                                            loading={isSubmitting}
                                            disabled={isSubmitting}
                                        >
                                            {isSubmitting ? 'Creating Account...' : 'Create Account'}
                                        </Button>
                                    </BlockStack>
                                </Form>
                            </BlockStack>
                        </Card>
                    </Layout.Section>
                </Layout>
            </BlockStack>
        </Page>
    );
}
