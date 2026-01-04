
import { useEffect, useState } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { Form, useActionData, useLoaderData, useSubmit, redirect, useNavigation, useNavigate } from "react-router";
import {
    Page,
    Layout,
    Card,
    Text,
    BlockStack,
    TextField,
    Button,
    Banner,
    Link,
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import { apiCallRaw } from "../api.server";


export const loader = async ({ request }: LoaderFunctionArgs) => {
    const { session } = await authenticate.admin(request);

    let isAuthenticated = false;
    try {
        const statusRes = await apiCallRaw(`/api/auth/status?shop=${session.shop}`, 'GET', undefined, { request });
        if (statusRes.ok) {
            const status = await statusRes.json();
            isAuthenticated = status.isAuthenticated;
        }
    } catch (e) {
        console.error("Auth check failed in loader", e);
    }

    return { shop: session.shop, isAuthenticated };
};

export const action = async ({ request }: ActionFunctionArgs) => {
    await authenticate.admin(request);
    const { session } = await authenticate.admin(request);
    const formData = await request.formData();

    const password = formData.get("password") as string;

    if (!password) {
        return { error: "Password is required." };
    }

    try {
        const loginRes = await apiCallRaw("/api/auth/login", "POST", {
            shopDomain: session.shop,
            password
        });

        if (!loginRes.ok) {
            const json = await loginRes.json();
            return { error: json.message || "Login failed" };
        }

        const setCookie = loginRes.headers.get('set-cookie');
        const headers: HeadersInit = {};
        if (setCookie) {
            headers['Set-Cookie'] = setCookie;
        }

        return redirect("/app", { headers });
    } catch (error: any) {
        console.error("Login Server Error:", error);
        return { error: "Login failed. Server error." };
    }
};

export default function Login() {
    const { shop, isAuthenticated } = useLoaderData<typeof loader>();
    const actionData = useActionData<typeof action>();
    const submit = useSubmit();
    const nav = useNavigation();
    const navigate = useNavigate();

    const [password, setPassword] = useState("");

    useEffect(() => {
        if (isAuthenticated) {
            // Auto-redirect if backend says we are logged in
            navigate("/app");
        }
    }, [isAuthenticated, navigate]);

    const isSubmitting = nav.state === "submitting";

    const handleSubmit = () => {
        submit({ password }, { method: "post" });
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
        <Page title="Login to Refertle">
            <BlockStack gap="500">
                <Layout>
                    <Layout.Section>
                        <Card>
                            <BlockStack gap="500">
                                <Text as="h2" variant="headingMd">
                                    Login for {shop}
                                </Text>

                                {actionData?.error && (
                                    <Banner tone="critical">
                                        <p>{actionData.error}</p>
                                    </Banner>
                                )}

                                <Form method="post">
                                    <BlockStack gap="400">
                                        <Text as="p" tone="subdued">
                                            Enter your password to access the dashboard.
                                        </Text>
                                        <TextField
                                            label="Password"
                                            type="password"
                                            value={password}
                                            onChange={setPassword}
                                            autoComplete="current-password"
                                            name="password"
                                            disabled={isSubmitting}
                                        />
                                        <Button
                                            onClick={handleSubmit}
                                            variant="primary"
                                            loading={isSubmitting}
                                            disabled={isSubmitting}
                                        >
                                            {isSubmitting ? 'Logging in...' : 'Login'}
                                        </Button>
                                    </BlockStack>
                                </Form>

                                <Text as="p" tone="subdued">
                                    Don't have an account? <Link url="/app/signup">Sign up here</Link>
                                </Text>
                            </BlockStack>
                        </Card>
                    </Layout.Section>
                </Layout>
            </BlockStack>
        </Page>
    );
}
