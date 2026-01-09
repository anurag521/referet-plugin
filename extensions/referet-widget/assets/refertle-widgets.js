document.addEventListener("DOMContentLoaded", async () => {
    // --- REFERTLE TRACKING SYSTEM ---
    try {
        const urlParams = new URL(window.location.href).searchParams;
        const refCode = urlParams.get('ref');
        const shopDomain = window.Shopify ? window.Shopify.shop : window.location.hostname;
        // Use window.refertle_app_url if set, otherwise fallback
        const appUrl = window.refertle_app_url || "https://edmond-mouthier-ununiquely.ngrok-free.dev";

        let activeCode = refCode;

        // 1. Persist Code
        if (refCode) {
            try { localStorage.setItem('refertle_ref_code', refCode); } catch (e) { }
        } else {
            try { activeCode = localStorage.getItem('refertle_ref_code'); } catch (e) { }
        }

        // 2. Track Click (Only if new code found on URL)
        if (refCode) {
            fetch(`${appUrl}/api/referrals/click?shop=${shopDomain}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' },
                body: JSON.stringify({ code: refCode })
            }).catch(e => console.warn('[Refertle] Click Track Failed', e));
        }

        // 3. Attribution (If logged in)
        const custId = window.refertle_customer_id;
        if (activeCode && custId) {
            fetch(`${appUrl}/api/referrals/validate?shop=${shopDomain}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' },
                body: JSON.stringify({ code: activeCode, customer_id: custId })
            }).catch(e => console.warn('[Refertle] Validate Failed', e));
        }
    } catch (err) {
        console.warn('[Refertle] Tracker Error:', err);
    }
    // --- END TRACKING ---

    const t = document.getElementById("refertle-points-value"), e = document.getElementById("refertle-wallet-value"); if (!t && !e) return; const n = window.Shopify ? window.Shopify.shop : window.location.hostname, o = window.Shopify && window.Shopify.designMode || !1; if (!window.refertle_app_url) { window.refertle_app_url = "https://edmond-mouthier-ununiquely.ngrok-free.dev" } const r = window.refertle_app_url, i = window.refertle_customer_id || ""; if (console.log("[Refertle] Init:", n, i), o) { console.log("[Refertle] Design Mode"); if (t) t.innerText = "100"; if (e) e.innerText = "₹500.00"; return } try { const o = `${r}/api/public/balance?shop=${n}&logged_in_customer_id=${i}`; console.log("[Refertle] Fetch:", o); const a = await fetch(o, { method: "GET", headers: { "Content-Type": "application/json", "ngrok-skip-browser-warning": "true" } }); if (a.ok) { const o = await a.json(); if (t && void 0 !== o.points) { t.innerText = o.points; const e = document.getElementById("refertle-points-popover-value"); e && (e.innerText = o.points); const n = document.getElementById("refertle-point-rate"); if (n) { const t = o.currency || "INR"; n.innerText = null !== o.point_value && void 0 !== o.point_value ? `${Number(o.point_value)} ${t}` : "-" } const a = document.getElementById("refertle-point-expiry"); if (a) { const t = o.points_expiry_days; a.innerText = t && t > 0 ? `${t} days` : "No Expiry" } const l = document.getElementById("refertle-redeem-btn"); if (l && l.remove(), Number(o.points) > 0) { const t = document.createElement("button"); t.id = "refertle-redeem-btn", t.textContent = "Redeem Points to Wallet", Object.assign(t.style, { marginTop: "12px", width: "100%", padding: "8px", backgroundColor: "#333", color: "#fff", border: "none", borderRadius: "4px", cursor: "pointer", fontWeight: "bold", fontSize: "13px" }), t.onclick = async e => { e.stopPropagation(), t.disabled = !0, t.textContent = "Redeeming..."; try { const e = await fetch(`${r}/api/public/points/redeem?shop=${n}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ customer_id: i }) }), o = await e.json(); e.ok && o.success ? (alert(`Success! Redeemed ${o.redeem_points} points for ${o.credit_amount} ${o.currency}.`), window.location.reload()) : (alert("Redemption failed: " + (o.message || "Unknown error")), t.disabled = !1, t.textContent = "Redeem Points to Wallet") } catch (e) { console.error(e), alert("Error connecting to server."), t.disabled = !1, t.textContent = "Redeem Points to Wallet" } }; const e = document.getElementById("refertle-points-popover"); e && e.appendChild(t) } } if (e && void 0 !== o.wallet) { const t = new Intl.NumberFormat("en-US", { style: "currency", currency: o.currency || "INR" }), n = t.format(o.wallet); e.innerText = n; const r = document.getElementById("refertle-wallet-popover-value"); r && (r.innerText = n); const i = document.getElementById("refertle-wallet-breakdown"); i && i.remove(); const a = document.createElement("div"); a.id = "refertle-wallet-breakdown", a.style.marginTop = "10px", a.style.fontSize = "13px", a.style.borderTop = "1px solid #eee", a.style.paddingTop = "12px"; const l = (o.expiring_credits || []).reduce(((t, e) => t + Number(e.amount)), 0), s = Math.max(0, Number(o.wallet) - l), c = document.createElement("div"); c.style.marginBottom = "6px", c.innerHTML = `Permanent Credit: <span class="highlight">${t.format(s)}</span>`, a.appendChild(c); const d = document.createElement("div"); if (d.style.marginBottom = "6px", d.innerHTML = `Temporary Credit: <span class="highlight">${t.format(l)}</span>`, a.appendChild(d), o.expiring_credits && o.expiring_credits.length > 0) { const e = document.createElement("div"); e.innerText = "Expiry Schedule:", e.style.fontWeight = "bold", e.style.marginTop = "10px", e.style.marginBottom = "4px", e.style.fontSize = "11px", e.style.color = "#777", a.appendChild(e), o.expiring_credits.forEach(e => { const n = document.createElement("div"); n.style.marginBottom = "2px", n.style.color = "#d63031", n.style.fontSize = "12px"; const o = new Date(e.expiresAt).toLocaleDateString(); n.innerText = `${t.format(e.amount)} (Expires: ${o})`, a.appendChild(n) }) } const p = document.getElementById("refertle-wallet-popover"); p && p.appendChild(a) } const l = (t, e) => { t && e && t.addEventListener("click", t => { t.stopPropagation(); const n = e.classList.contains("visible"); document.querySelectorAll(".refertle-popover").forEach(t => t.classList.remove("visible")), n || e.classList.add("visible") }) }; l(document.getElementById("refertle-points-btn"), document.getElementById("refertle-points-popover")), l(document.getElementById("refertle-wallet-btn"), document.getElementById("refertle-wallet-popover")), document.addEventListener("click", () => { document.querySelectorAll(".refertle-popover").forEach(t => t.classList.remove("visible")) }) } else console.error("Refertle: Failed to fetch balance", a.status) } catch (t) { console.error("Refertle: Error fetching balance", t) }
});