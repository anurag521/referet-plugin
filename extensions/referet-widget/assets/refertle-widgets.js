document.addEventListener("DOMContentLoaded", async () => {
    // --- SINGLETON GUARD: Prevent double firing if multiple widgets exist ---
    if (window.refertle_global_init) return;
    window.refertle_global_init = true;

    // --- SHARED VARIABLES ---
    const shopDomain = window.Shopify ? window.Shopify.shop : window.location.hostname;
    // Use window.refertle_app_url if set, otherwise fallback
    const APP_URL = window.refertle_app_url || "https://edmond-mouthier-ununiquely.ngrok-free.dev";

    let activeCode = null;

    // --- REFERTLE TRACKING SYSTEM ---
    try {
        const urlParams = new URL(window.location.href).searchParams;
        const refCode = urlParams.get('ref');

        activeCode = refCode;

        // 1. Persist Code
        if (refCode) {
            try { localStorage.setItem('refertle_ref_code', refCode); } catch (e) { }
        } else {
            try { activeCode = localStorage.getItem('refertle_ref_code'); } catch (e) { }
        }

        // 2. Track Click (Only if new code found on URL)
        if (refCode) {
            // Use adblocker-safe route alias
            fetch(`${APP_URL}/api/svc/interact?shop=${shopDomain}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' },
                body: JSON.stringify({ code: refCode })
            }).catch(e => console.warn('[Refertle] Click Track Failed', e));
        }

        // 3. Attribution (If logged in)
        const custId = window.refertle_customer_id;
        if (activeCode && custId) {
            fetch(`${APP_URL}/api/referrals/validate?shop=${shopDomain}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' },
                body: JSON.stringify({ code: activeCode, customer_id: custId })
            }).catch(e => console.warn('[Refertle] Validate Failed', e));
        }
    } catch (err) {
        console.warn('[Refertle] Tracker Error:', err);
    }

    // --- 4. CART ATTRIBUTION (DEBUGGING ENABLED) ---
    async function ensureCartAttribute(code) {
        if (!code) {
            console.log('[Refertle-Debug] No code to sync to cart.');
            return;
        }
        try {
            console.log('[Refertle-Debug] Checking Cart Attributes for code:', code);

            // A. Check current cart attributes
            const cartRes = await fetch('/cart.js');
            if (!cartRes.ok) {
                console.warn('[Refertle-Debug] Failed to fetch cart:', cartRes.status);
                return;
            }
            const cart = await cartRes.json();
            console.log('[Refertle-Debug] Current Cart Attributes:', JSON.stringify(cart.attributes));

            // Only update if attribute is missing or different
            if (cart.attributes && cart.attributes.ref === code) {
                console.log('[Refertle-Debug] Attribute already correctly set. Skipping update.');
                return;
            }

            console.log('[Refertle-Debug] Attribute Mismatch! Sending update to /cart/update.js ...');

            // B. Update Cart Attributes
            const updateRes = await fetch('/cart/update.js', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    attributes: { ref: code }
                })
            });

            if (updateRes.ok) {
                const updatedCart = await updateRes.json();
                console.log('[Refertle-Debug] Cart Update Success! New Attributes:', JSON.stringify(updatedCart.attributes));
            } else {
                console.error('[Refertle-Debug] Cart Update FAILED:', updateRes.status, await updateRes.text());
            }
        } catch (e) {
            console.warn('[Refertle-Debug] Cart Attribute Exec Error:', e);
        }
    }

    // Call it if we have a code
    if (activeCode) {
        // Debounce slightly to not block initial load
        setTimeout(() => ensureCartAttribute(activeCode), 1000);
    }

    // --- 5. BALANCE DISPLAY LOGIC (Un-minified) ---
    const pointsSpan = document.getElementById("refertle-points-value");
    const walletSpan = document.getElementById("refertle-wallet-value");

    // Only proceed if at least one widget is present
    if (!pointsSpan && !walletSpan) return;

    const isDesignMode = (window.Shopify && window.Shopify.designMode) || false;
    const loggedInCustId = window.refertle_customer_id || "";

    console.log("[Refertle] Balance Init:", shopDomain, loggedInCustId);

    if (isDesignMode) {
        console.log("[Refertle] Design Mode Active");
        if (pointsSpan) pointsSpan.innerText = "100";
        if (walletSpan) walletSpan.innerText = "₹500.00";
        return;
    }

    if (!loggedInCustId) {
        // Not logged in
        if (pointsSpan) pointsSpan.innerText = "-";
        if (walletSpan) walletSpan.innerText = "-";
        return;
    }

    async function fetchBalance() {
        try {
            const url = `${APP_URL}/api/public/balance?shop=${shopDomain}&logged_in_customer_id=${loggedInCustId}`;
            console.log("[Refertle] Fetching Balance:", url);

            const res = await fetch(url, {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                    "ngrok-skip-browser-warning": "true"
                }
            });

            if (res.ok) {
                const data = await res.json();

                // Update Points
                if (pointsSpan && data.points !== undefined) {
                    pointsSpan.innerText = data.points;

                    // Update Popover Details
                    const popVal = document.getElementById("refertle-points-popover-value");
                    if (popVal) popVal.innerText = data.points;

                    const rateSpan = document.getElementById("refertle-point-rate");
                    if (rateSpan) {
                        const curr = data.currency || "INR";
                        rateSpan.innerText = (data.point_value !== null) ? `${Number(data.point_value)} ${curr}` : "-";
                    }

                    const expirySpan = document.getElementById("refertle-point-expiry");
                    if (expirySpan) {
                        const days = data.points_expiry_days;
                        expirySpan.innerText = (days && days > 0) ? `${days} days` : "No Expiry";
                    }

                    // Redemption Button Logic
                    const redeemBtn = document.getElementById("refertle-redeem-btn");
                    if (redeemBtn) redeemBtn.remove(); // Reset

                    if (Number(data.points) > 0) {
                        const btn = document.createElement("button");
                        btn.id = "refertle-redeem-btn";
                        btn.textContent = "Redeem Points to Wallet";
                        Object.assign(btn.style, {
                            marginTop: "12px", width: "100%", padding: "8px",
                            backgroundColor: "#1cd6b1", color: "#fff", border: "none",
                            borderRadius: "4px", cursor: "pointer", fontWeight: "bold", fontSize: "13px"
                        });

                        btn.onclick = async (ev) => {
                            ev.stopPropagation();
                            btn.disabled = true;
                            btn.textContent = "Redeeming...";
                            try {
                                const rRes = await fetch(`${APP_URL}/api/public/points/redeem?shop=${shopDomain}`, {
                                    method: "POST",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({ customer_id: loggedInCustId })
                                });
                                const rData = await rRes.json();
                                if (rRes.ok && rData.success) {
                                    alert(`Success! Redeemed ${rData.redeem_points} points for ${rData.credit_amount} ${rData.currency}.`);
                                    window.location.reload();
                                } else {
                                    alert("Redemption failed: " + (rData.message || "Unknown error"));
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

                // Update Wallet
                if (walletSpan && data.wallet !== undefined) {
                    const formatter = new Intl.NumberFormat("en-US", { style: "currency", currency: data.currency || "INR" });
                    const formatted = formatter.format(data.wallet);

                    walletSpan.innerText = formatted;

                    const popVal = document.getElementById("refertle-wallet-popover-value");
                    if (popVal) popVal.innerText = formatted;

                    // Breakdown
                    const breakdownId = "refertle-wallet-breakdown";
                    const oldBreakdown = document.getElementById(breakdownId);
                    if (oldBreakdown) oldBreakdown.remove();

                    const div = document.createElement("div");
                    div.id = breakdownId;
                    div.style.marginTop = "10px";
                    div.style.fontSize = "13px";
                    div.style.borderTop = "1px solid #eee";
                    div.style.paddingTop = "12px";

                    const expiringTotal = (data.expiring_credits || []).reduce((acc, c) => acc + Number(c.amount), 0);
                    const permanent = Math.max(0, Number(data.wallet) - expiringTotal);

                    const pRow = document.createElement("div");
                    pRow.style.marginBottom = "6px";
                    pRow.innerHTML = `Permanent Credit: <span class="highlight">${formatter.format(permanent)}</span>`;
                    div.appendChild(pRow);

                    const tRow = document.createElement("div");
                    tRow.style.marginBottom = "6px";
                    tRow.innerHTML = `Temporary Credit: <span class="highlight">${formatter.format(expiringTotal)}</span>`;
                    div.appendChild(tRow);

                    if (data.expiring_credits && data.expiring_credits.length > 0) {
                        const title = document.createElement("div");
                        title.innerText = "Expiry Schedule:";
                        title.style.fontWeight = "bold"; title.style.marginTop = "10px"; title.style.marginBottom = "4px"; title.style.fontSize = "11px"; title.style.color = "#777";
                        div.appendChild(title);

                        data.expiring_credits.forEach(c => {
                            const row = document.createElement("div");
                            row.style.marginBottom = "2px"; row.style.color = "#d63031"; row.style.fontSize = "12px";
                            const dateStr = new Date(c.expiresAt).toLocaleDateString();
                            row.innerText = `${formatter.format(c.amount)} (Expires: ${dateStr})`;
                            div.appendChild(row);
                        });
                    }

                    const popover = document.getElementById("refertle-wallet-popover");
                    if (popover) popover.appendChild(div);
                }

                // Setup Popover Toggles
                const setupToggle = (btnId, popoverId) => {
                    const b = document.getElementById(btnId);
                    const p = document.getElementById(popoverId);
                    if (b && p) {
                        b.addEventListener('click', (ev) => {
                            ev.stopPropagation();
                            const isVis = p.classList.contains('visible');
                            // Close others
                            document.querySelectorAll('.refertle-popover').forEach(el => el.classList.remove('visible'));
                            if (!isVis) p.classList.add('visible');
                        });
                    }
                };

                setupToggle('refertle-points-btn', 'refertle-points-popover');
                setupToggle('refertle-wallet-btn', 'refertle-wallet-popover');

                document.addEventListener('click', () => {
                    document.querySelectorAll('.refertle-popover').forEach(el => el.classList.remove('visible'));
                });

            } else {
                console.error("[Refertle] Failed to fetch balance", res.status);
            }
        } catch (err) {
            console.error("[Refertle] Error fetching balance", err);
        }
    }

    // Trigger Fetch
    fetchBalance();

});