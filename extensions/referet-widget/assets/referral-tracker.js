document.addEventListener('DOMContentLoaded', () => {
    const tracker = document.getElementById('referet-global-tracker');
    if (!tracker) return;

    const isLoggedIn = tracker.dataset.loggedIn === 'true';
    const shop = tracker.dataset.shop;
    // Use global config if available, else fallback
    const API_BASE = window.refertle_app_url || "https://edmond-mouthier-ununiquely.ngrok-free.dev";

    // --- 1. Capture Referral Code ---
    const urlParams = new URLSearchParams(window.location.search);
    const refCode = urlParams.get('ref');

    if (refCode) {
        console.log("Referet (Global): Captured referral code:", refCode);
        localStorage.setItem('referet_ref_code', refCode);

        // --- CLEAN URL (Remove ?ref=... parameter) ---
        const url = new URL(window.location.href);
        url.searchParams.delete('ref');
        window.history.replaceState({}, document.title, url.toString());

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
    const productId = tracker.dataset.productId;
    const collectionIds = tracker.dataset.collectionIds || '';

    // --- Helper: Simple Toast to show messages ---
    function showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `referet-toast referet-toast-${type}`;
        toast.textContent = message;

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
        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 300);
        }, 4000);
    }

    // Check Campaign first to see if rewards are even active
    async function checkCurrentCampaign() {
        if (!storedRefCode) return;
        try {
            const res = await fetch(`${API_BASE}/api/public/campaigns/check?shop=${shop}&product_id=${productId}&collection_ids=${collectionIds}`, {
                headers: { "ngrok-skip-browser-warning": "true" }
            });
            if (res.ok) {
                const data = await res.json();
                if (data.active) {
                    console.log("Referet: Active campaign found for this page context.");

                    if (!isLoggedIn) {
                        console.log("Referet (Global): Guest detected with referral code. Prompting login.");

                        // 1. Show Guest Modal (as before)
                        const guestModal = document.getElementById('referet-guest-modal');
                        const guestClose = document.getElementById('referet-guest-close');
                        if (guestModal) {
                            setTimeout(() => guestModal.style.display = 'block', 1000);
                            if (guestClose) guestClose.addEventListener('click', () => guestModal.style.display = 'none');
                        }

                        // 2. CRITICAL: Validate & Apply Discount for Guest Session immediately
                        // This ensures they see the discount at checkout even if they don't log in yet.
                        performClaim();
                    } else {
                        performClaim();
                    }
                }
            }
        } catch (e) {
            console.error("Referet: Campaign check failed", e);
        }
    }

    function performClaim() {
        console.log("Referet (Global): User logged in with pending referral code. Validating...");
        const customerId = tracker.dataset.customerId;

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
                console.log("Referet: Validation Response", data);

                if (data.valid) {
                    showToast("Referral Applied! Enjoy your reward 🎁", "success");
                    localStorage.removeItem('referet_ref_code');

                    if (data.discount_code) {
                        // 1. Standard Cookie Method (Backup)
                        fetch(`/discount/${data.discount_code}`).catch(e => console.error("Discount apply failed", e));

                        // 2. ROBUST FORM INJECTION
                        // This forces the discount code to be carried over to the Checkout page 
                        // when the user clicks "Check out" in the Cart Drawer.
                        const injectDiscount = () => {
                            const forms = document.querySelectorAll('form[action^="/cart"], form[action^="/checkout"]');
                            forms.forEach(form => {
                                // Check if we already injected
                                if (!form.querySelector('input[name="discount"]')) {
                                    console.log("Referet: Injecting discount code into checkout form", data.discount_code);
                                    const input = document.createElement('input');
                                    input.type = 'hidden';
                                    input.name = 'discount';
                                    input.value = data.discount_code;
                                    form.appendChild(input);
                                }
                            });
                        };

                        // Run once immediately
                        injectDiscount();

                        // Run whenever the DOM changes (e.g., Cart Drawer opens)
                        // This ensures "Edge Case" coverage for AJAX carts.
                        const observer = new MutationObserver(() => injectDiscount());
                        observer.observe(document.body, { childList: true, subtree: true });
                    }

                    // Attach Attribute to Cart
                    const attachAttribute = () => {
                        fetch('/cart/update.js', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ attributes: { 'referral_code': storedRefCode } })
                        }).catch(e => console.error("Referet: Failed to save attribute", e));
                    };
                    setTimeout(attachAttribute, 500);

                } else {
                    console.warn("Referet: Invalid Referral Code", data.message);
                    if (data.error_code === 'SELF_REFERRAL') {
                        showToast("Self-referral not allowed 😅", "error");
                        localStorage.removeItem('referet_ref_code');
                    }
                }
            })
            .catch(err => console.error("Referet: Claim Failed", err));
    }

    checkCurrentCampaign();
});
