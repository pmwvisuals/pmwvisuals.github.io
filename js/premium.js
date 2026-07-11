import { auth } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-auth.js";
import { isPremiumUser } from "./premium-access.js";
import { PADDLE_CONFIG } from "./paddle-config.js";

const statusBox = document.querySelector("#premiumStatus");
const checkoutButtons = Array.from(document.querySelectorAll(".premium-checkout"));
const message = document.querySelector("#premiumMessage");

let paddleReady = false;

function setCheckoutState({ disabled, messageText, onClick, labelPrefix }) {
  checkoutButtons.forEach((button) => {
    const plan = button.dataset.plan || "Premium";
    button.textContent = labelPrefix ? `${labelPrefix} ${plan}` : `Upgrade to ${plan}`;
    button.disabled = disabled;
    button.onclick = onClick ? () => onClick(plan) : null;
  });
  if (messageText) message.textContent = messageText;
}

function absoluteUrl(path) {
  return new URL(path, window.location.origin).toString();
}

function ensurePaddleReady() {
  if (!window.Paddle) {
    throw new Error("Paddle checkout library is not loaded.");
  }

  if (paddleReady) return;

  if (PADDLE_CONFIG.environment === "sandbox" && window.Paddle.Environment?.set) {
    window.Paddle.Environment.set("sandbox");
  }

  window.Paddle.Initialize({
    token: PADDLE_CONFIG.clientToken
  });
  paddleReady = true;
}

function hasPaddlePrice() {
  return Boolean(PADDLE_CONFIG.priceId && PADDLE_CONFIG.priceId.trim());
}

async function startCheckout(user, planName = "Premium") {
  if (!hasPaddlePrice()) {
    message.textContent = "Add your Paddle price ID in js/paddle-config.js before accepting payments.";
    message.classList.add("error");
    return;
  }

  setCheckoutState({
    disabled: true,
    labelPrefix: "Opening",
    messageText: `Opening Paddle checkout for ${planName}.`
  });

  try {
    ensurePaddleReady();
    window.Paddle.Checkout.open({
      items: [
        {
          priceId: PADDLE_CONFIG.priceId,
          quantity: 1
        }
      ],
      customer: {
        email: user.email || undefined
      },
      customData: {
        uid: user.uid,
        product: "pmw-premium",
        plan: planName
      },
      settings: {
        successUrl: absoluteUrl("premium-success.html")
      }
    });

    setCheckoutState({
      disabled: false,
      labelPrefix: "Upgrade to",
      messageText: "Complete payment in the Paddle checkout window.",
      onClick: (plan) => startCheckout(user, plan)
    });
  } catch (error) {
    console.error("Unable to open Paddle checkout.", error);
    setCheckoutState({
      disabled: false,
      labelPrefix: "Try",
      messageText: "Paddle checkout is not available yet. Check the client token and price ID.",
      onClick: (plan) => startCheckout(user, plan)
    });
    message.classList.add("error");
  }
}

onAuthStateChanged(auth, async (user) => {
  message.classList.remove("error");

  if (!user) {
    statusBox.textContent = "Sign in first, then return here to upgrade.";
    setCheckoutState({
      disabled: false,
      labelPrefix: "Sign in for",
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
      disabled: false,
      labelPrefix: "Open",
      messageText: "You can open the premium area from this page.",
      onClick: () => {
        window.location.href = "premium-wallpapers.html";
      }
    });
    return;
  }

  statusBox.textContent = "You are signed in as a free member.";
  if (!hasPaddlePrice()) {
    setCheckoutState({
      disabled: true,
      labelPrefix: "Add price for",
      messageText: "Add your Paddle price ID in js/paddle-config.js to enable checkout."
    });
    return;
  }

  setCheckoutState({
    disabled: false,
    labelPrefix: "Upgrade to",
    messageText: "Checkout opens securely through Paddle.",
    onClick: (plan) => startCheckout(user, plan)
  });
});
