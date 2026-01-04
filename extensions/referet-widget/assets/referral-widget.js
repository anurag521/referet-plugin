document.addEventListener('DOMContentLoaded', async () => {
    const container = document.getElementById('referet-widget-container');
    if (!container) return;

    const shop = container.dataset.shop;
    const productId = container.dataset.productId;
    const customerId = container.dataset.customerId;
    const collectionIds = container.dataset.collectionIds || '';
    const isLoggedIn = container.dataset.loggedIn === 'true';

    // UI Elements
    const btn = document.getElementById('referet-btn');
    const modal = document.getElementById('referet-modal');
    const closeBtn = document.getElementById('referet-close');
    const rewardTextFn = document.getElementById('referet-reward-text');
    const loadingDiv = document.getElementById('referet-loading');
    const resultDiv = document.getElementById('referet-result');
    const errorMsg = document.getElementById('referet-error');
    const linkInput = document.getElementById('referet-link');
    const copyBtn = document.getElementById('referet-copy-btn');
    const guestModal = document.getElementById('referet-guest-modal');
    const guestClose = document.getElementById('referet-guest-close');

    const API_BASE = "https://edmond-mouthier-ununiquely.ngrok-free.dev";
    let campaignId = null;

    // --- 1. Referral Tracking Logic (Referee URL Capture) ---
    const urlParams = new URLSearchParams(window.location.search);
    const refCode = urlParams.get('ref');

    if (refCode) {
        console.log("Referet: Captured referral code:", refCode);
        localStorage.setItem('referet_ref_code', refCode);

        // --- TRACK CLICK IMMEDIATELY ---
        fetch(`${API_BASE}/api/public/referrals/click?shop=${shop}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'ngrok-skip-browser-warning': 'true'
            },
            body: JSON.stringify({ code: refCode })
        }).catch(err => console.error("Referet: Tracking failed", err));
    }

    const storedRefCode = localStorage.getItem('referet_ref_code');

    // Guest Handling: If guest AND has ref code, show "Login" modal automatically
    if (!isLoggedIn && storedRefCode) {
        console.log("Referet: Guest detected with referral code. Prompting login.");
        if (guestModal) {
            setTimeout(() => {
                guestModal.style.display = 'block';
            }, 1000);
        }
    } else if (isLoggedIn && storedRefCode) {
        // --- LOGGED IN: AUTO-CLAIM ---
        console.log("Referet: User logged in with code. Attempting claim... CustomerID:", customerId);
        fetch(`${API_BASE}/api/public/referrals/claim?shop=${shop}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'ngrok-skip-browser-warning': 'true'
            },
            body: JSON.stringify({
                code: storedRefCode,
                customer_id: customerId
            })
        })
            .then(res => res.json())
            .then(data => {
                console.log("Referet: Claim Response", data);
                if (data.valid) {
                    // Success! Show Toast
                    showToast("Referral applied successfully!", "success");
                    // Clear storage so we don't spam the API on every page load
                    localStorage.removeItem('referet_ref_code');
                } else {
                    // Check for specific error codes for Toast
                    if (data.error_code === 'SELF_REFERRAL') {
                        showToast("Nice try! You cannot refer yourself 😅", "error");
                        localStorage.removeItem('referet_ref_code'); // Clear it so it doesn't annoy them
                    } else if (data.error_code === 'ALREADY_CLAIMED') {
                        showToast("You have already claimed a referral reward!", "warning");
                        localStorage.removeItem('referet_ref_code');
                    }
                }
            })
            .catch(err => console.error("Referet: Claim failed", err));
    }

    // --- Helper: Simple Toast to show messages ---
    function showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `referet-toast referet-toast-${type}`;
        toast.textContent = message;

        // Basic Styles for the toast (injected here for simplicity, or could be in CSS)
        // We assume CSS class exists or we allow basic inline styling fallback
        Object.assign(toast.style, {
            position: 'fixed',
            bottom: '20px',
            right: '20px',
            backgroundColor: type === 'error' ? '#ff4d4f' : (type === 'success' ? '#52c41a' : '#faad14'),
            color: 'white',
            padding: '12px 24px',
            borderRadius: '4px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            zIndex: '10000',
            fontSize: '14px',
            fontFamily: 'inherit',
            transition: 'opacity 0.3s ease'
        });

        document.body.appendChild(toast);

        // Remove after 3 seconds
        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 300);
        }, 4000);
    }

    // --- 2. Initial Campaign Check (Update UI Text) ---
    async function checkCampaign() {
        // if (!isLoggedIn) return; // Allow guests to see the button too
        try {
            const res = await fetch(`${API_BASE}/api/public/campaigns/check?shop=${shop}&product_id=${productId}&collection_ids=${collectionIds}`, {
                headers: { "ngrok-skip-browser-warning": "true", "Content-Type": "application/json" }
            });
            if (res.ok) {
                const data = await res.json();
                if (data.active) {
                    campaignId = data.campaign_id;
                    if (rewardTextFn && data.reward_text) {
                        rewardTextFn.textContent = data.reward_text;
                    }

                    // Show Button & Update Text
                    if (btn) {
                        btn.style.display = 'block';
                        // Use the combined text for the bar as well
                        btn.textContent = data.reward_text;
                    }
                }
            }
        } catch (e) {
            console.error('Referet: Initial campaign check failed', e);
        }
    }

    // Call it
    await checkCampaign();

    // --- 3. Interaction Logic ---

    // Click on "Refer & Earn" Button
    if (btn) {
        btn.addEventListener('click', async () => {
            if (isLoggedIn) {
                // Users Logged In -> Open Generator Modal & Generate
                if (modal) {
                    modal.style.display = 'block';
                    resetModal();
                    await generateLink();
                }
            } else {
                // Guest -> Open Login Modal
                if (guestModal) guestModal.style.display = 'block';
            }
        });
    }

    // Helper: Generate Link via API
    async function generateLink() {
        if (loadingDiv) loadingDiv.style.display = 'block';

        let payload = {
            campaign_id: campaignId,
            product_id: productId,
            customer_id: customerId
        };

        try {
            // Note: You might want to use /api/public/referrals/create or similar
            // We stick to the existing logic visible in previous files
            const res = await fetch(`${API_BASE}/api/public/referrals/create?shop=${shop}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'ngrok-skip-browser-warning': 'true'
                },
                body: JSON.stringify(payload)
            });

            const data = await res.json();

            if (loadingDiv) loadingDiv.style.display = 'none';

            if (data.referral_url) {
                if (resultDiv) resultDiv.style.display = 'block';
                if (linkInput) linkInput.value = data.referral_url;
            } else {
                throw new Error(data.message || 'No active campaign or failed to generate.');
            }

        } catch (e) {
            if (loadingDiv) loadingDiv.style.display = 'none';
            if (errorMsg) {
                errorMsg.textContent = e.message;
                errorMsg.style.display = 'block';
            }
        }
    }

    // --- 4. Close Handlers ---
    if (closeBtn) closeBtn.addEventListener('click', () => { if (modal) modal.style.display = 'none'; });

    if (guestClose) guestClose.addEventListener('click', () => {
        if (guestModal) guestModal.style.display = 'none';
    });

    window.addEventListener('click', (event) => {
        if (modal && event.target == modal) modal.style.display = 'none';
        if (guestModal && event.target == guestModal) guestModal.style.display = 'none';
    });

    if (copyBtn && linkInput) {
        copyBtn.addEventListener('click', () => {
            linkInput.select();
            document.execCommand('copy');
            const originalText = copyBtn.textContent;
            copyBtn.textContent = "Copied!";
            setTimeout(() => copyBtn.textContent = originalText, 2000);
        });
    }

    function resetModal() {
        if (loadingDiv) loadingDiv.style.display = 'none';
        if (resultDiv) resultDiv.style.display = 'none';
        if (errorMsg) errorMsg.style.display = 'none';
        if (linkInput) linkInput.value = '';
    }

});
