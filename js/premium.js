import { auth } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-auth.js";
import { isPremiumUser } from "./premium-access.js";
import { PADDLE_CONFIG } from "./paddle-config.js";

const statusBox = document.querySelector("#premiumStatus");
const checkoutButtons = Array.from(document.querySelectorAll(".premium-checkout"));
const message = document.querySelector("#premiumMessage");
const viewButtons = Array.from(document.querySelectorAll("[data-plan-view]"));
const planCards = Array.from(document.querySelectorAll(".pmw-plan-card"));
const pricingGrid = document.querySelector(".pmw-pricing-grid");

let paddleReady = false;
let currentCheckoutDisabled = true;
let currentCheckoutHandler = null;
let currentLabelPrefix = "Upgrade to";

function buttonPlanLabel(button, labelPrefix) {
  const plan = button.dataset.plan || "Premium";
  const billing = button.dataset.billing === "yearly" ? " Yearly" : "";
  return labelPrefix ? `${labelPrefix} ${plan}${billing}` : `Upgrade to ${plan}${billing}`;
}

function refreshButtonLabels() {
  checkoutButtons.forEach((button) => {
    button.textContent = buttonPlanLabel(button, currentLabelPrefix);
    button.disabled = currentCheckoutDisabled;
    button.onclick = currentCheckoutHandler
      ? () => currentCheckoutHandler(button.dataset.plan || "Premium", button.dataset.billing || "monthly")
      : null;
  });
}

function setCheckoutState({ disabled, messageText, onClick, labelPrefix }) {
  currentCheckoutDisabled = disabled;
  currentCheckoutHandler = onClick || null;
  currentLabelPrefix = labelPrefix || "Upgrade to";
  refreshButtonLabels();
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

function getPaddlePriceId(planName, billing) {
  return PADDLE_CONFIG.prices?.[planName]?.[billing] || "";
}

function hasAnyPaddlePrice() {
  return Object.values(PADDLE_CONFIG.prices || {}).some((planPrices) => {
    return Object.values(planPrices || {}).some((priceId) => Boolean(priceId && priceId.trim()));
  });
}

function formatUsd(value) {
  return Number(value).toFixed(2);
}

function savingPercent(original, discounted) {
  if (!original || original <= discounted) return 0;
  return Math.round(((original - discounted) / original) * 100);
}

function updatePlanBilling(card, billing) {
  const monthly = Number(card.dataset.monthly);
  const yearOriginal = Number(card.dataset.yearOriginal);
  const yearPrice = Number(card.dataset.yearPrice);
  const price = card.querySelector(".pmw-price strong");
  const cycle = card.querySelector(".pmw-price em");
  const yearlyLine = card.querySelector(".pmw-yearly-line");
  const checkoutButton = card.querySelector(".premium-checkout");

  card.dataset.billing = billing;
  if (checkoutButton) checkoutButton.dataset.billing = billing;

  card.querySelectorAll("[data-billing-option]").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.billingOption === billing);
  });

  if (billing === "yearly") {
    price.textContent = formatUsd(yearPrice);
    cycle.textContent = "USD / year";
    const save = savingPercent(yearOriginal, yearPrice);
    yearlyLine.innerHTML = save
      ? `<del>$${formatUsd(yearOriginal)}</del> $${formatUsd(yearPrice)} for yr <span class="pmw-save-badge">Save ${save}%</span>`
      : `$${formatUsd(yearOriginal)} for yr`;
  } else {
    price.textContent = formatUsd(monthly);
    cycle.textContent = "USD / month";
    yearlyLine.textContent = "";
  }

  refreshButtonLabels();
}

function setPlanView(view) {
  viewButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.planView === view);
  });

  planCards.forEach((card) => {
    card.classList.toggle("is-hidden", card.dataset.audience !== view);
  });

  if (pricingGrid) {
    pricingGrid.classList.toggle("business-only", view === "business");
  }
}

function initPricingControls() {
  planCards.forEach((card) => {
    if (card.dataset.monthly) updatePlanBilling(card, card.dataset.billing || "monthly");
  });

  document.querySelectorAll("[data-billing-option]").forEach((button) => {
    button.addEventListener("click", () => {
      const card = button.closest(".pmw-plan-card");
      if (card) updatePlanBilling(card, button.dataset.billingOption);
    });
  });

  viewButtons.forEach((button) => {
    button.addEventListener("click", () => setPlanView(button.dataset.planView));
  });

  setPlanView("personal");
}

async function startCheckout(user, planName = "Premium", billing = "monthly") {
  const priceId = getPaddlePriceId(planName, billing);
  if (!priceId) {
    message.textContent = `Add the Paddle ${planName} ${billing} price ID in js/paddle-config.js before accepting payments.`;
    message.classList.add("error");
    return;
  }

  setCheckoutState({
    disabled: true,
    labelPrefix: "Opening",
    messageText: `Opening Paddle checkout for ${planName} ${billing}.`
  });

  try {
    ensurePaddleReady();
    window.Paddle.Checkout.open({
      items: [
        {
          priceId: priceId,
          quantity: 1
        }
      ],
      customer: {
        email: user.email || undefined
      },
      customData: {
        uid: user.uid,
        product: "pmw-premium",
        plan: planName,
        billing: billing
      },
      settings: {
        successUrl: absoluteUrl("premium-success.html")
      }
    });

    setCheckoutState({
      disabled: false,
      labelPrefix: "Upgrade to",
      messageText: "Complete payment in the Paddle checkout window.",
      onClick: (plan, selectedBilling) => startCheckout(user, plan, selectedBilling)
    });
  } catch (error) {
    console.error("Unable to open Paddle checkout.", error);
    setCheckoutState({
      disabled: false,
      labelPrefix: "Try",
      messageText: "Paddle checkout is not available yet. Check the client token and price ID.",
      onClick: (plan, selectedBilling) => startCheckout(user, plan, selectedBilling)
    });
    message.classList.add("error");
  }
}

initPricingControls();

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
  if (!hasAnyPaddlePrice()) {
    setCheckoutState({
      disabled: true,
      labelPrefix: "Add price for",
      messageText: "Add your Paddle monthly and yearly price IDs in js/paddle-config.js to enable checkout."
    });
    return;
  }

  setCheckoutState({
    disabled: false,
    labelPrefix: "Upgrade to",
    messageText: "Checkout opens securely through Paddle.",
    onClick: (plan, selectedBilling) => startCheckout(user, plan, selectedBilling)
  });
});
