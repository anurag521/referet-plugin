document.addEventListener("DOMContentLoaded", async () => {
    const pointsContainer = document.getElementById("refertle-points-value");
    const walletContainer = document.getElementById("refertle-wallet-value");

    if (!pointsContainer && !walletContainer) return;

    const shopDomain = window.Shopify ? window.Shopify.shop : window.location.hostname;

    // Use the App URL directly (Direct Fetch Strategy)
    // Fallback to the hardcoded dev URL if the liquid variable isn't injected yet
    const appUrl = window.refertle_app_url || "https://edmond-mouthier-ununiquely.ngrok-free.dev";

    // Fix: Define customerId from global variable injected by Liquid
    const customerId = window.refertle_customer_id || "";

    try {
        console.log("[Refertle] Fetching from:", `${appUrl}/api/public/balance`);
        const response = await fetch(`${appUrl}/api/public/balance?shop=${shopDomain}&logged_in_customer_id=${customerId}`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                "ngrok-skip-browser-warning": "true"
            },
        });
        console.log("[Refertle] Balance Fetch Status:", response.status);

        if (response.ok) {
            const text = await response.text();
            console.log("[Refertle] Raw Response:", text);

            let data;
            try {
                data = JSON.parse(text);
            } catch (e) {
                console.error("[Refertle] Failed to parse JSON:", e);
                return;
            }

            // Update UI
            if (pointsContainer) {
                pointsContainer.innerText = data.points;
            }

            if (walletContainer) {
                // Format Currency
                const formatter = new Intl.NumberFormat('en-US', {
                    style: 'currency',
                    currency: data.currency || 'INR',
                });
                walletContainer.innerText = formatter.format(data.wallet);
            }

        } else {
            console.error("Refertle: Failed to fetch balance", response.status);
        }

    } catch (error) {
        console.error("Refertle: Error fetching balance", error);
    }
});
