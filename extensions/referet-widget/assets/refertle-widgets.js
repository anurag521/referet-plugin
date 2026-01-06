document.addEventListener("DOMContentLoaded", async () => {
    const pointsContainer = document.getElementById("refertle-points-value");
    const walletContainer = document.getElementById("refertle-wallet-value");

    if (!pointsContainer && !walletContainer) return;

    const shopDomain = window.Shopify ? window.Shopify.shop : window.location.hostname;

    // Check for Shopify Design Mode (Theme Editor)
    const isDesignMode = (window.Shopify && window.Shopify.designMode) || false;

    // Use the App URL directly (Direct Fetch Strategy)
    // Fallback to the hardcoded dev URL if the liquid variable isn't injected yet
    // SAFETY: Check if process is defined to prevent browser reference errors
    const envUrl = (typeof process !== 'undefined' && process.env) ? process.env.SHOPIFY_APP_URL : null;
    const appUrl = envUrl || window.refertle_app_url || "https://edmond-mouthier-ununiquely.ngrok-free.dev";

    // Fix: Define customerId from global variable injected by Liquid
    const customerId = window.refertle_customer_id || "";

    console.log("---------------- REFERTLE DEBUG ----------------");
    console.log("[Refertle] Initializing Widget...");
    console.log("[Refertle] Shop Domain:", shopDomain);
    console.log("[Refertle] Customer ID:", customerId);
    console.log("[Refertle] App URL:", appUrl);
    console.log("[Refertle] Target Elements:", {
        points: !!pointsContainer,
        wallet: !!walletContainer
    });

    // --- DESIGN MODE PREVIEW ---
    if (isDesignMode) {
        console.log("[Refertle] Design Mode Detected. Rendering mock data.");
        // Show dummy data so merchant can see how it looks
        if (pointsContainer) pointsContainer.innerText = "100";
        if (walletContainer) walletContainer.innerText = "₹500.00"; // Default or infer from settings if possible
        return;
    }

    try {
        const fetchUrl = `${appUrl}/api/public/balance?shop=${shopDomain}&logged_in_customer_id=${customerId}`;
        console.log("[Refertle] Fetching Balance from:", fetchUrl);

        const response = await fetch(fetchUrl, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                "ngrok-skip-browser-warning": "true"
            },
        });
        console.log("[Refertle] Response Status:", response.status);

        if (response.ok) {
            const text = await response.text();
            console.log("[Refertle] Raw Body received:", text);

            let data;
            try {
                data = JSON.parse(text);
            } catch (e) {
                console.error("[Refertle] Failed to parse JSON:", e);
                return;
            }

            // Update UI - Points
            const pointsBtn = document.getElementById("refertle-points-btn");
            const pointsPopover = document.getElementById("refertle-points-popover");

            if (pointsContainer && data.points !== undefined) {
                pointsContainer.innerText = data.points;
                const popValue = document.getElementById("refertle-points-popover-value");
                if (popValue) popValue.innerText = data.points;

                const popRate = document.getElementById("refertle-point-rate");
                if (popRate) {
                    const currency = data.currency || 'INR';
                    // Check strict null/undefined because 0 is a valid value (though unlikely for rate)
                    const rate = (data.point_value !== null && data.point_value !== undefined) ? `${Number(data.point_value)} ${currency}` : '-';
                    popRate.innerText = rate;
                }

                const popExpiry = document.getElementById("refertle-point-expiry");
                if (popExpiry) {
                    // If explictly null or undefined, assume no expiry. If 0, it technically expires in 0 days (today).
                    const days = data.points_expiry_days;
                    popExpiry.innerText = (days !== null && days !== undefined && days > 0) ? `${days} days` : 'No Expiry';
                }

                // --- INJECT REDEEM BUTTON ---
                // Remove existing if any to avoid duplicates on re-run
                const existingBtn = document.getElementById("refertle-redeem-btn");
                if (existingBtn) existingBtn.remove();

                if (Number(data.points) > 0) {
                    const redeemBtn = document.createElement("button");
                    redeemBtn.id = "refertle-redeem-btn";
                    redeemBtn.textContent = "Redeem Points to Wallet";
                    // Styling inline for speed, or add class
                    Object.assign(redeemBtn.style, {
                        marginTop: "12px",
                        width: "100%",
                        padding: "8px",
                        backgroundColor: "#333",
                        color: "#fff",
                        border: "none",
                        borderRadius: "4px",
                        cursor: "pointer",
                        fontWeight: "bold",
                        fontSize: "13px"
                    });

                    redeemBtn.onclick = async (e) => {
                        e.stopPropagation(); // prevent closing popover
                        redeemBtn.disabled = true;
                        redeemBtn.textContent = "Redeeming...";

                        try {
                            const res = await fetch(`${appUrl}/api/public/points/redeem?shop=${shopDomain}`, {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json',
                                    'ngrok-skip-browser-warning': 'true'
                                },
                                body: JSON.stringify({ customer_id: customerId })
                            });

                            const result = await res.json();
                            if (res.ok && result.success) {
                                alert(`Success! Redeemed ${result.redeem_points} points for ${result.credit_amount} ${result.currency}.`);
                                window.location.reload(); // Refresh to update wallet and points UI from fresh state
                            } else {
                                alert("Redemption failed: " + (result.message || "Unknown error"));
                                redeemBtn.disabled = false;
                                redeemBtn.textContent = "Redeem Points to Wallet";
                            }
                        } catch (err) {
                            console.error(err);
                            alert("Error connecting to server.");
                            redeemBtn.disabled = false;
                            redeemBtn.textContent = "Redeem Points to Wallet";
                        }
                    };

                    // Append to popover
                    if (pointsPopover) pointsPopover.appendChild(redeemBtn);
                }
            } // Closing pointsContainer check

            // Update UI - Wallet
            const walletBtn = document.getElementById("refertle-wallet-btn");
            const walletPopover = document.getElementById("refertle-wallet-popover");

            if (walletContainer && data.wallet !== undefined) {
                // Format Currency
                const formatter = new Intl.NumberFormat('en-US', {
                    style: 'currency',
                    currency: data.currency || 'INR',
                });
                const formattedWallet = formatter.format(data.wallet);
                walletContainer.innerText = formattedWallet;

                const popWalletVal = document.getElementById("refertle-wallet-popover-value");
                if (popWalletVal) popWalletVal.innerText = formattedWallet;

                // --- INJECT WALLET BREAKDOWN ---
                const existingBreakdown = document.getElementById("refertle-wallet-breakdown");
                if (existingBreakdown) existingBreakdown.remove();

                const breakdownContainer = document.createElement("div");
                breakdownContainer.id = "refertle-wallet-breakdown";
                breakdownContainer.style.marginTop = "10px";
                breakdownContainer.style.fontSize = "13px";
                breakdownContainer.style.borderTop = "1px solid #eee";
                breakdownContainer.style.paddingTop = "12px";

                const expiringSum = (data.expiring_credits || []).reduce((sum, c) => sum + Number(c.amount), 0);
                const permanentAmount = Math.max(0, Number(data.wallet) - expiringSum);

                const breakdownFormatter = new Intl.NumberFormat('en-US', {
                    style: 'currency',
                    currency: data.currency || 'INR',
                });

                // Permanent Line
                const permLine = document.createElement("div");
                permLine.style.marginBottom = "6px";
                permLine.innerHTML = `Permanent Credit: <span class="highlight">${breakdownFormatter.format(permanentAmount)}</span>`;
                breakdownContainer.appendChild(permLine);

                // Temporary Line
                const tempLine = document.createElement("div");
                tempLine.style.marginBottom = "6px";
                tempLine.innerHTML = `Temporary Credit: <span class="highlight">${breakdownFormatter.format(expiringSum)}</span>`;
                breakdownContainer.appendChild(tempLine);

                if (data.expiring_credits && data.expiring_credits.length > 0) {
                    const expiryTitle = document.createElement("div");
                    expiryTitle.innerText = "Expiry Schedule:";
                    expiryTitle.style.fontWeight = "bold";
                    expiryTitle.style.marginTop = "10px";
                    expiryTitle.style.marginBottom = "4px";
                    expiryTitle.style.fontSize = "11px";
                    expiryTitle.style.color = "#777";
                    breakdownContainer.appendChild(expiryTitle);

                    data.expiring_credits.forEach(credit => {
                        const item = document.createElement("div");
                        item.style.marginBottom = "2px";
                        item.style.color = "#d63031"; // red for expiry
                        item.style.fontSize = "12px";

                        const date = new Date(credit.expiresAt).toLocaleDateString();
                        const amt = breakdownFormatter.format(credit.amount);

                        item.innerText = `${amt} (Expires: ${date})`;
                        breakdownContainer.appendChild(item);
                    });
                }

                if (walletPopover) walletPopover.appendChild(breakdownContainer);
            }

            // Click Handlers for Popovers
            const togglePopover = (btn, popover) => {
                if (!btn || !popover) return;
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const isVisible = popover.classList.contains('visible');
                    // Close all others
                    document.querySelectorAll('.refertle-popover').forEach(p => p.classList.remove('visible'));
                    if (!isVisible) popover.classList.add('visible');
                });
            };

            if (pointsBtn) togglePopover(pointsBtn, document.getElementById("refertle-points-popover"));
            if (walletBtn) togglePopover(walletBtn, walletPopover);

            // Close on click outside
            document.addEventListener('click', () => {
                document.querySelectorAll('.refertle-popover').forEach(p => p.classList.remove('visible'));
            });



        } else {
            console.error("Refertle: Failed to fetch balance", response.status);
        }

    } catch (error) {
        console.error("Refertle: Error fetching balance", error);
    }
});
