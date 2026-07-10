import { auth } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-auth.js";
import { addDoc, collection, onSnapshot } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js";
import { db } from "./firebase.js";
import { isPremiumUser } from "./premium-access.js";
import { STRIPE_MODE, STRIPE_PRICE_ID } from "./stripe-config.js";

const statusBox = document.querySelector("#premiumStatus");
const checkoutBtn = document.querySelector("#checkoutBtn");
const message = document.querySelector("#premiumMessage");
let activeCheckoutListener = null;

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
  if (!STRIPE_PRICE_ID || STRIPE_PRICE_ID.includes("REPLACE")) {
    message.textContent = "Add your Stripe price ID in js/stripe-config.js before accepting payments.";
    message.classList.add("error");
    return;
  }

  setCheckoutState({
    label: "Opening Checkout...",
    disabled: true,
    messageText: "Creating a secure Stripe Checkout session."
  });

  try {
    const checkoutSessionRef = await addDoc(
      collection(db, "customers", user.uid, "checkout_sessions"),
      {
        price: STRIPE_PRICE_ID,
        mode: STRIPE_MODE,
        success_url: absoluteUrl("premium-success.html"),
        cancel_url: absoluteUrl("premium-cancel.html"),
        allow_promotion_codes: true
      }
    );

    activeCheckoutListener = onSnapshot(checkoutSessionRef, (snap) => {
      const data = snap.data();
      if (!data) return;

      if (data.error) {
        setCheckoutState({
          label: "Try Checkout Again",
          disabled: false,
          messageText: data.error.message || "Stripe Checkout could not start.",
          onClick: () => startCheckout(user)
        });
        message.classList.add("error");
      }

      if (data.url) {
        window.location.assign(data.url);
      }
    });
  } catch (error) {
    console.error("Unable to create checkout session.", error);
    setCheckoutState({
      label: "Try Checkout Again",
      disabled: false,
      messageText: "Checkout is not available yet. Check the Firebase Stripe extension setup.",
      onClick: () => startCheckout(user)
    });
    message.classList.add("error");
  }
}

onAuthStateChanged(auth, async (user) => {
  if (activeCheckoutListener) {
    activeCheckoutListener();
    activeCheckoutListener = null;
  }

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
  if (!STRIPE_PRICE_ID) {
    setCheckoutState({
      label: "Add Stripe Price ID",
      disabled: true,
      messageText: "Add your real Stripe price ID in js/stripe-config.js to enable checkout."
    });
    return;
  }

  setCheckoutState({
    label: "Upgrade With Stripe",
    disabled: false,
    messageText: "Checkout opens securely through Stripe.",
    onClick: () => startCheckout(user)
  });
});

window.addEventListener("pagehide", () => {
  if (activeCheckoutListener) activeCheckoutListener();
});
