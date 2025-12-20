(function () {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("ref");
  
    if (!ref) return;
  
    // Do not overwrite existing referral
    if (localStorage.getItem("referral_code")) return;
  
    localStorage.setItem("referral_code", ref);
  
    // Get discount code for this referral and apply it automatically
    const APP_URL = window.APP_URL || 'https://nonelucidating-goateed-samual.ngrok-free.dev';
    
    fetch(`${APP_URL}/referral/discount?referralCode=${encodeURIComponent(ref)}`, {
      headers: {
        "ngrok-skip-browser-warning": "true"
      }
    })
    .then(res => res.json())
    .then(data => {
      if (data.discountCode) {
        // Store discount code
        localStorage.setItem("referral_discount_code", data.discountCode);
        
        // Apply discount code using Shopify's standard discount endpoint
        fetch(`/discount/${data.discountCode}`, {
          method: 'POST',
          credentials: 'same-origin',
        })
        .then(() => {
          console.log("Discount code applied:", data.discountCode);
          // Show success notification
          showNotification(`🎉 10% discount applied! Code: ${data.discountCode}`, 'success');
          // Reload page to show updated cart with discount
          setTimeout(() => window.location.reload(), 1000);
        })
        .catch(err => {
          console.error("Error applying discount:", err);
          // Show discount code to user if auto-apply fails
          showNotification(`Use discount code at checkout: ${data.discountCode}`, 'info');
        });
      }
    })
    .catch(err => {
      console.error("Error getting discount code:", err);
    });
  
    // Helper function to show notifications
    function showNotification(message, type) {
      const notification = document.createElement('div');
      notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'success' ? '#4CAF50' : '#2196F3'};
        color: white;
        padding: 15px 20px;
        border-radius: 5px;
        z-index: 9999;
        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        font-family: Arial, sans-serif;
        max-width: 300px;
      `;
      notification.textContent = message;
      document.body.appendChild(notification);
      setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transition = 'opacity 0.3s';
        setTimeout(() => notification.remove(), 300);
      }, 4000);
    }
  
    // Attach referral to cart attributes (for tracking)
    fetch("/cart/update.js", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        attributes: {
          referral_code: ref,
        },
      }),
    });
  })();
  
  document.addEventListener("DOMContentLoaded", () => {
    const btn = document.getElementById("share-referral-btn");
    const box = document.getElementById("referral-link-box");
    const input = document.getElementById("referral-link");
    const copyBtn = document.getElementById("copy-referral");
  
    if (!btn || !window.LOGGED_IN_CUSTOMER_ID) return;
  
    btn.addEventListener("click", async () => {
      const shopDomain = window.SHOP_DOMAIN || window.location.hostname;
      const res = await fetch(
        `https://nonelucidating-goateed-samual.ngrok-free.dev/referral/link?customerId=${window.LOGGED_IN_CUSTOMER_ID}&shopDomain=${encodeURIComponent(shopDomain)}`,
        {
          headers: {
            "ngrok-skip-browser-warning": "true" // Bypass ngrok free tier warning page
          }
        }
      );
      
      if (!res.ok) {
        const text = await res.text();
        console.error("HTTP error:", res.status, text.substring(0, 200));
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      
      const contentType = res.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        const text = await res.text();
        console.error("Expected JSON but got:", text.substring(0, 200));
        throw new Error("Server returned non-JSON response");
      }
      
      const data = await res.json();

      input.value = data.referralLink;
      box.style.display = "block";
    });
  
    copyBtn.addEventListener("click", () => {
      navigator.clipboard.writeText(input.value);
      alert("Referral link copied!");
    });
  });
  