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

    // --- 2. Guest Handling (Show Guest Modal) ---
    if (!isLoggedIn && storedRefCode) {
        console.log("Referet (Global): Guest detected with referral code. Prompting login.");

        const guestModal = document.getElementById('referet-guest-modal');
        const guestClose = document.getElementById('referet-guest-close');
        if (guestModal) {
            setTimeout(() => guestModal.style.display = 'block', 1000);
            if (guestClose) guestClose.addEventListener('click', () => guestModal.style.display = 'none');
            window.addEventListener('click', (e) => { if (e.target == guestModal) guestModal.style.display = 'none'; });
        }
    }

    // --- 3. Logged In Handling (Claim Reward via Public API) ---
    else if (isLoggedIn && storedRefCode) {
        console.log("Referet (Global): User logged in with pending referral code. Validating...");
        const customerId = tracker.dataset.customerId;

        // Call Backend to Validate/Claim (Updated to Public API)
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
                    // Success!
                    localStorage.removeItem('referet_ref_code'); // Clear it so it doesn't run again

                    // Optional: If backend returns a discount code, you can try to auto-apply it
                    if (data.discount_code) {
                        try {
                            fetch(`/discount/${data.discount_code}`).then(() => console.log("Discount applied to session"));
                        } catch (e) { console.error("Failed to auto-apply discount", e); }
                    }

                    // --- ALWAYS Attach Attribute to Cart (Vital for Backend Webhook Tracking) ---
                    // Do this regardless of discount code availability
                    console.log("Referet: Attempting to save Cart Attribute...");
                    const attachAttribute = () => {
                        fetch('/cart/update.js', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ attributes: { 'referral_code': storedRefCode } })
                        })
                            .then(res => res.json())
                            .then(cart => {
                                console.log("Referet: Cart Attribute Saved", cart.attributes);
                                // Simple retry if not saved (sometimes cart is busy)
                                if (!cart.attributes || cart.attributes.referral_code !== storedRefCode) {
                                    console.warn("Referet: Attribute mismatch, retrying in 2s...");
                                    setTimeout(attachAttribute, 2000);
                                }
                            })
                            .catch(e => console.error("Referet: Failed to save attribute", e));
                    };

                    // Delay slightly to ensure cart exists or discount fetch didn't lock it
                    setTimeout(attachAttribute, 500);

                } else {
                    console.warn("Referet: Invalid Referral Code", data.message);
                }
            })
            .catch(err => console.error("Referet: Validation Failed", err));
    }
});
