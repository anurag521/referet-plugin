document.addEventListener("DOMContentLoaded", async () => {
    const pointsEl = document.getElementById("refertle-points-value");
    const walletEl = document.getElementById("refertle-wallet-value");

    if (!pointsEl && !walletEl) return;

    // --- Configuration ---
    const shop = window.Shopify ? window.Shopify.shop : window.location.hostname;
    const isDesignMode = (window.Shopify && window.Shopify.designMode) || false;

    // SINGLE SOURCE OF TRUTH FOR APP URL
    // If you need to change the backend URL, CHANGE IT HERE ONLY.
    // Ideally, use "/apps/rewards" for Proxy, or the ngrok URL for direct dev.
    if (!window.refertle_app_url) {
        window.refertle_app_url = "https://edmond-mouthier-ununiquely.ngrok-free.dev";
        // window.refertle_app_url = "/apps/rewards"; // Use this for Production Proxy
    }
    const APP_URL = window.refertle_app_url;

    const customerId = window.refertle_customer_id || "";

    console.log("---------------- REFERTLE WIDGET ----------------");
    console.log("[Refertle] Initializing Widget (Proxy Mode)...");
    console.log("[Refertle] Shop:", shop);
    console.log("[Refertle] Customer:", customerId);

    // --- Design Mode Mock ---
    if (isDesignMode) {
        console.log("[Refertle] Design Mode Detected. Rendering mock data.");
        if (pointsEl) pointsEl.innerText = "100";
        if (walletEl) walletEl.innerText = "₹500.00";
        return;
    }

    try {
        // Fetch Balance via Proxy
        // Endpoint: /apps/rewards/balance -> Backend: /api/public/balance
        const endpoint = `${APP_URL}/api/public/balance?shop=${shop}&logged_in_customer_id=${customerId}`;
        console.log("[Refertle] Fetching Balance from:", endpoint);

        const response = await fetch(endpoint, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                "ngrok-skip-browser-warning": "true"
            }
        });

        console.log("[Refertle] Response Status:", response.status);

        if (response.ok) {
            const data = await response.json();
            console.log("[Refertle] Data:", data);

            // --- Update Points Widget ---
            if (pointsEl && data.points !== undefined) {
                pointsEl.innerText = data.points;

                // Helper: Update Popover
                const popVal = document.getElementById("refertle-points-popover-value");
                if (popVal) popVal.innerText = data.points;

                const rateEl = document.getElementById("refertle-point-rate");
                if (rateEl) {
                    const curr = data.currency || "INR";
                    rateEl.innerText = (data.point_value !== null && data.point_value !== undefined)
                        ? `${Number(data.point_value)} ${curr}`
                        : "-";
                }

                const expiryEl = document.getElementById("refertle-point-expiry");
                if (expiryEl) {
                    const days = data.points_expiry_days;
                    expiryEl.innerText = (days && days > 0) ? `${days} days` : "No Expiry";
                }

                // Redeem Button Logic
                const redeemBtn = document.getElementById("refertle-redeem-btn");
                if (redeemBtn) redeemBtn.remove(); // specific to refactor, ensuring no dupe

                if (Number(data.points) > 0) {
                    const btn = document.createElement("button");
                    btn.id = "refertle-redeem-btn";
                    btn.textContent = "Redeem Points to Wallet";
                    Object.assign(btn.style, {
                        marginTop: "12px", width: "100%", padding: "8px",
                        backgroundColor: "#333", color: "#fff", border: "none",
                        borderRadius: "4px", cursor: "pointer", fontWeight: "bold", fontSize: "13px"
                    });

                    btn.onclick = async (e) => {
                        e.stopPropagation();
                        btn.disabled = true;
                        btn.textContent = "Redeeming...";
                        try {
                            // Redeem via Proxy
                            const redeemRes = await fetch(`${APP_URL}/api/public/points/redeem?shop=${shop}`, {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ customer_id: customerId })
                            });
                            const redeemData = await redeemRes.json();

                            if (redeemRes.ok && redeemData.success) {
                                alert(`Success! Redeemed ${redeemData.redeem_points} points for ${redeemData.credit_amount} ${redeemData.currency}.`);
                                window.location.reload();
                            } else {
                                alert("Redemption failed: " + (redeemData.message || "Unknown error"));
                                btn.disabled = false;
                                btn.textContent = "Redeem Points to Wallet";
                            }
                        } catch (err) {
                            console.error(err);
                            alert("Error connecting to server.");
                            btn.disabled = false;
                            btn.textContent = "Redeem Points to Wallet";
                        }
                    };
                    const popover = document.getElementById("refertle-points-popover");
                    if (popover) popover.appendChild(btn);
                }
            }

            // --- Update Wallet Widget ---
            if (walletEl && data.wallet !== undefined) {
                const fmt = new Intl.NumberFormat("en-US", { style: "currency", currency: data.currency || "INR" });
                const formattedWallet = fmt.format(data.wallet);

                walletEl.innerText = formattedWallet;
                const popVal = document.getElementById("refertle-wallet-popover-value");
                if (popVal) popVal.innerText = formattedWallet;

                // Breakdown
                const existingBreakdown = document.getElementById("refertle-wallet-breakdown");
                if (existingBreakdown) existingBreakdown.remove();

                const breakdown = document.createElement("div");
                breakdown.id = "refertle-wallet-breakdown";
                breakdown.style.marginTop = "10px";
                breakdown.style.fontSize = "13px";
                breakdown.style.borderTop = "1px solid #eee";
                breakdown.style.paddingTop = "12px";

                const expiringSum = (data.expiring_credits || []).reduce((acc, c) => acc + Number(c.amount), 0);
                const permanent = Math.max(0, Number(data.wallet) - expiringSum);

                const permDiv = document.createElement("div");
                permDiv.style.marginBottom = "6px";
                permDiv.innerHTML = `Permanent Credit: <span class="highlight">${fmt.format(permanent)}</span>`;
                breakdown.appendChild(permDiv);

                const expDiv = document.createElement("div");
                expDiv.style.marginBottom = "6px";
                expDiv.innerHTML = `Temporary Credit: <span class="highlight">${fmt.format(expiringSum)}</span>`;
                breakdown.appendChild(expDiv);

                if (data.expiring_credits && data.expiring_credits.length > 0) {
                    const title = document.createElement("div");
                    title.innerText = "Expiry Schedule:";
                    title.style.fontWeight = "bold";
                    title.style.marginTop = "10px";
                    title.style.marginBottom = "4px";
                    title.style.fontSize = "11px";
                    title.style.color = "#777";
                    breakdown.appendChild(title);

                    data.expiring_credits.forEach(c => {
                        const row = document.createElement("div");
                        row.style.marginBottom = "2px";
                        row.style.color = "#d63031";
                        row.style.fontSize = "12px";
                        const dateStr = new Date(c.expiresAt).toLocaleDateString();
                        row.innerText = `${fmt.format(c.amount)} (Expires: ${dateStr})`;
                        breakdown.appendChild(row);
                    });
                }

                const popover = document.getElementById("refertle-wallet-popover");
                if (popover) popover.appendChild(breakdown);
            }

            // --- Popover Toggle Logic ---
            const setupPopover = (btn, popover) => {
                if (btn && popover) {
                    btn.addEventListener("click", (e) => {
                        e.stopPropagation();
                        // Close others
                        const wasVisible = popover.classList.contains("visible");
                        document.querySelectorAll(".refertle-popover").forEach(el => el.classList.remove("visible"));
                        if (!wasVisible) popover.classList.add("visible");
                    });
                }
            };

            setupPopover(document.getElementById("refertle-points-btn"), document.getElementById("refertle-points-popover"));
            setupPopover(document.getElementById("refertle-wallet-btn"), document.getElementById("refertle-wallet-popover"));

            document.addEventListener("click", () => {
                document.querySelectorAll(".refertle-popover").forEach(el => el.classList.remove("visible"));
            });

        } else {
            console.error("Refertle: Failed to fetch balance", response.status);
        }

    } catch (e) {
        console.error("Refertle: Error fetching balance", e);
    }
});