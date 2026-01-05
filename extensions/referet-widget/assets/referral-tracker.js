document.addEventListener('DOMContentLoaded', () => {
    const tracker = document.getElementById('referet-global-tracker');
    if (!tracker) return;

    const isLoggedIn = tracker.dataset.loggedIn === 'true';
    const shop = tracker.dataset.shop;
    const API_BASE = "https://edmond-mouthier-ununiquely.ngrok-free.dev";

    // --- 1. Capture Referral Code ---
    const urlParams = new URLSearchParams(window.location.search);
    const refCode = urlParams.get('ref');

    if (refCode) {
        console.log("Referet (Global): Captured referral code:", refCode);
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
                        const guestModal = document.getElementById('referet-guest-modal');
                        const guestClose = document.getElementById('referet-guest-close');
                        if (guestModal) {
                            setTimeout(() => guestModal.style.display = 'block', 1000);
                            if (guestClose) guestClose.addEventListener('click', () => guestModal.style.display = 'none');
                        }
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
                        fetch(`/discount/${data.discount_code}`).catch(e => console.error("Discount apply failed", e));
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
