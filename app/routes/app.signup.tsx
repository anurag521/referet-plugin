import { useState } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { Form, useActionData, useLoaderData, useSubmit, redirect } from "react-router";
import {
    Page,
    Layout,
    Text,
    Card,
    Button,
    BlockStack,
    TextField,
    Banner,
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import { apiCall } from "../api.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
    const { admin, session } = await authenticate.admin(request);

    // We can pre-fill the shop domain
    return { shop: session.shop };
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
        // Call Backend API to Create Merchant
        const result = await apiCall("/api/auth/merchant/signup", "POST", {
            name,
            email,
            phone,
            password,
            shop_domain: session.shop,
        });

        // If successful, redirect to dashboard
        // We could set a session flag here if needed, but for now we assume success means we can go to dashboard
        return redirect("/app");
    } catch (error: any) {
        console.error("Signup Failed", error);
        return { error: error.message || "Registration failed. Please try again." };
    }
};

export default function Signup() {
    const { shop } = useLoaderData<typeof loader>();
    const actionData = useActionData<typeof action>();
    const submit = useSubmit();

    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [phone, setPhone] = useState("");
    const [password, setPassword] = useState("");

    const handleSubmit = () => {
        submit({ name, email, phone, password }, { method: "post" });
    };

    return (
        <Page title="Welcome to Refertle">
            <BlockStack gap="500">
                <Layout>
                    <Layout.Section>
                        <Card>
                            <BlockStack gap="500">
                                <Text as="h2" variant="headingMd">
                                    Complete your registration
                                </Text>
                                <Text as="p" variant="bodyMd">
                                    Set up your merchant account for shop: <strong>{shop}</strong>
                                </Text>

                                {actionData?.error && (
                                    <Banner tone="critical">
                                        <p>{actionData.error}</p>
                                    </Banner>
                                )}

                                <Form method="post">
                                    <BlockStack gap="400">
                                        <TextField
                                            label="Merchant Name"
                                            type="text"
                                            name="name"
                                            value={name}
                                            onChange={setName}
                                            autoComplete="name"
                                        />
                                        <TextField
                                            label="Email"
                                            type="email"
                                            name="email"
                                            value={email}
                                            onChange={setEmail}
                                            autoComplete="email"
                                        />
                                        <TextField
                                            label="Phone (Optional)"
                                            type="tel"
                                            name="phone"
                                            value={phone}
                                            onChange={setPhone}
                                            autoComplete="tel"
                                        />
                                        <TextField
                                            label="Password"
                                            type="password"
                                            name="password"
                                            value={password}
                                            onChange={setPassword}
                                            autoComplete="new-password"
                                            helpText="Create a password for the Refertle Merchant Portal."
                                        />
                                        <Button onClick={handleSubmit} variant="primary">
                                            Create Account
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
