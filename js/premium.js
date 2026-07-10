import { auth } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-auth.js";
import { isPremiumUser } from "./premium-access.js";
import { PAYHERE_CONFIG } from "./payhere-config.js";

const statusBox = document.querySelector("#premiumStatus");
const checkoutBtn = document.querySelector("#checkoutBtn");
const message = document.querySelector("#premiumMessage");

function setCheckoutState({ label, disabled, messageText, onClick }) {
  checkoutBtn.textContent = label;
  checkoutBtn.disabled = disabled;
  checkoutBtn.onclick = onClick || null;
  if (messageText) message.textContent = messageText;
}

function absoluteUrl(path) {
  return new URL(path, window.location.origin).toString();
}

async function startCheckout(user) {
  if (!PAYHERE_CONFIG.merchantId || !PAYHERE_CONFIG.createPaymentEndpoint) {
    message.textContent = "Add your PayHere merchant ID and backend endpoint in js/payhere-config.js before accepting payments.";
    message.classList.add("error");
    return;
  }

  setCheckoutState({
    label: "Opening Checkout...",
    disabled: true,
    messageText: "Creating a signed PayHere payment."
  });

  try {
    const token = await user.getIdToken();
    const response = await fetch(PAYHERE_CONFIG.createPaymentEndpoint, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        amount: PAYHERE_CONFIG.amount,
        currency: PAYHERE_CONFIG.currency,
        itemName: PAYHERE_CONFIG.itemName,
        returnUrl: absoluteUrl("premium-success.html"),
        cancelUrl: absoluteUrl("premium-cancel.html")
      })
    });

    if (!response.ok) throw new Error("PayHere payment creation failed.");

    const payment = await response.json();
    if (!window.payhere || typeof window.payhere.startPayment !== "function") {
      throw new Error("PayHere checkout library is not loaded.");
    }

    window.payhere.onCompleted = () => {
      window.location.href = "premium-success.html";
    };
    window.payhere.onDismissed = () => {
      setCheckoutState({
        label: "Upgrade With PayHere",
        disabled: false,
        messageText: "PayHere checkout was closed before payment finished.",
        onClick: () => startCheckout(user)
      });
    };
    window.payhere.onError = () => {
      setCheckoutState({
        label: "Try Checkout Again",
        disabled: false,
        messageText: "PayHere reported a checkout error.",
        onClick: () => startCheckout(user)
      });
      message.classList.add("error");
    };

    window.payhere.startPayment(payment);
  } catch (error) {
    console.error("Unable to create PayHere payment.", error);
    setCheckoutState({
      label: "Try Checkout Again",
      disabled: false,
      messageText: "PayHere checkout is not available yet. Check the backend signing endpoint.",
      onClick: () => startCheckout(user)
    });
    message.classList.add("error");
  }
}

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    statusBox.textContent = "Sign in first, then return here to upgrade.";
    setCheckoutState({
      label: "Sign In To Continue",
      disabled: false,
      messageText: "Premium checkout requires a PMW Visuals account.",
      onClick: () => {
        window.location.href = "login.html";
      }
    });
    return;
  }

  const isPremium = await isPremiumUser(user);
  if (isPremium) {
    statusBox.textContent = "Premium access is active for this account.";
    setCheckoutState({
      label: "Open Premium Wallpapers",
      disabled: false,
      messageText: "You can open the premium area from this page.",
      onClick: () => {
        window.location.href = "premium-wallpapers.html";
      }
    });
    return;
  }

  statusBox.textContent = "You are signed in as a free member.";
  if (!PAYHERE_CONFIG.merchantId || !PAYHERE_CONFIG.createPaymentEndpoint) {
    setCheckoutState({
      label: "Add PayHere Setup",
      disabled: true,
      messageText: "Add your PayHere merchant ID and backend endpoint in js/payhere-config.js to enable checkout."
    });
    return;
  }

  setCheckoutState({
    label: "Upgrade With PayHere",
    disabled: false,
    messageText: "Checkout opens securely through PayHere.",
    onClick: () => startCheckout(user)
  });
});
