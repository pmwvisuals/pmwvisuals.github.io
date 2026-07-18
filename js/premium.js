import { auth, db } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js";
import { isPremiumUser } from "./premium-access.js?v=20260718-premium-gate";
import { PADDLE_CONFIG, PRICING_TIERS } from "./paddle-config.js?v=20260718-yearly-savings";

const statusBox = document.querySelector("#premiumStatus");
const message = document.querySelector("#premiumMessage");
const frequencyButtons = Array.from(document.querySelectorAll("[data-frequency]"));
const pricingGrid = document.querySelector("#pricingGrid");

let paddleReady = false;
let signedInUser = null;
let signedInPaddleCustomerId = "";
let isPremiumMember = false;
let frequency = "monthly";
let localizedPrices = {};

function absoluteUrl(path) {
  return new URL(path, window.location.origin).toString();
}

function setMessage(text = "", type = "") {
  message.textContent = text;
  message.classList.toggle("error", type === "error");
  message.classList.toggle("success", type === "success");
}

function validatePaddleConfig() {
  if (!PADDLE_CONFIG.environment) {
    throw new Error("Paddle environment is missing in js/paddle-config.js.");
  }

  if (!PADDLE_CONFIG.clientToken) {
    throw new Error("Paddle client-side token is missing in js/paddle-config.js.");
  }

  if (PADDLE_CONFIG.environment === "sandbox" && !PADDLE_CONFIG.clientToken.startsWith("test_")) {
    throw new Error("Sandbox checkout requires a test_ Paddle client-side token.");
  }

  if (PADDLE_CONFIG.environment === "production" && !PADDLE_CONFIG.clientToken.startsWith("live_")) {
    throw new Error("Production checkout requires a live_ Paddle client-side token.");
  }

  const missingPrices = PRICING_TIERS.flatMap((tier) => {
    return ["monthly", "yearly"].filter((cycle) => !tier.priceId?.[cycle]).map((cycle) => `${tier.name} ${cycle}`);
  });

  if (missingPrices.length) {
    throw new Error(`Missing Paddle price IDs: ${missingPrices.join(", ")}.`);
  }
}

function ensurePaddleReady() {
  validatePaddleConfig();

  if (!window.Paddle) {
    throw new Error("Paddle checkout library is not loaded.");
  }

  if (paddleReady) return;

  const initOptions = {
    token: PADDLE_CONFIG.clientToken
  };

  if (PADDLE_CONFIG.environment === "production" && signedInPaddleCustomerId) {
    initOptions.pwCustomer = { id: signedInPaddleCustomerId };
  }

  window.Paddle.Initialize(initOptions);

  paddleReady = true;
}

function selectedPriceId(tier) {
  return frequency === "yearly" ? tier.priceId.yearly : tier.priceId.monthly;
}

function priceLabel(tier) {
  return localizedPrices[selectedPriceId(tier)] || "Loading...";
}

function yearlySavingsMarkup(tier) {
  if (frequency !== "yearly" || !tier.yearlyValue?.savePercent) {
    return "";
  }

  return `
    <div class="pmw-yearly-line">
      <span class="pmw-save-badge">Save ${tier.yearlyValue.savePercent}%</span>
      <span class="pmw-yearly-compare">Monthly x12: <del>${tier.yearlyValue.monthlyTotal}</del></span>
    </div>
  `;
}

function frequencyText() {
  return frequency === "yearly" ? "year" : "month";
}

function checkoutDisabled() {
  return isPremiumMember || !paddleReady;
}

function renderPricing() {
  pricingGrid.innerHTML = PRICING_TIERS.map((tier) => {
    const highlight = tier.featured ? " featured" : "";
    const disabled = checkoutDisabled() ? " disabled" : "";
    const buttonText = isPremiumMember ? "Active Plan" : "Subscribe";
    const badge = tier.featured ? '<div class="pmw-recommend-badge">Best Value</div>' : "";
    const features = tier.features.map((feature) => `<li><span>OK</span>${feature}</li>`).join("");

    return `
      <article class="pmw-plan-card${highlight}" data-tier="${tier.name}">
        ${badge}
        <h2>${tier.name}</h2>
        <div class="pmw-price">
          <strong>${priceLabel(tier)}</strong>
          <em>/${frequencyText()}</em>
        </div>
        ${yearlySavingsMarkup(tier)}
        <p>${tier.description}</p>
        <button class="pmw-plan-button premium-checkout" data-tier="${tier.name}" type="button"${disabled}>${buttonText}</button>
        <ul>${features}</ul>
      </article>
    `;
  }).join("");

  pricingGrid.querySelectorAll(".premium-checkout").forEach((button) => {
    button.addEventListener("click", () => startCheckout(button.dataset.tier));
  });
}

async function loadLocalizedPrices() {
  try {
    ensurePaddleReady();
    setMessage("Loading localized Paddle prices...");

    const items = PRICING_TIERS.flatMap((tier) => [
      { priceId: tier.priceId.monthly, quantity: 1 },
      { priceId: tier.priceId.yearly, quantity: 1 }
    ]);

    const preview = await window.Paddle.PricePreview({ items });
    const lineItems = preview?.data?.details?.lineItems || [];
    localizedPrices = lineItems.reduce((prices, item) => {
      if (item.price?.id && item.formattedTotals?.total) {
        prices[item.price.id] = item.formattedTotals.total;
      }
      return prices;
    }, {});

    setMessage("");
  } catch (error) {
    console.error("Unable to load Paddle localized prices.", error);
    setMessage(error.message || "Unable to load Paddle prices. Check the Paddle token and price IDs.", "error");
  }

  renderPricing();
}

async function startCheckout(tierName) {
  const tier = PRICING_TIERS.find((item) => item.name === tierName);
  const priceId = tier ? selectedPriceId(tier) : "";

  if (!tier || !priceId) {
    setMessage("This tier is missing a Paddle price ID.", "error");
    return;
  }

  try {
    ensurePaddleReady();
    setMessage(`Opening ${tier.name} ${frequencyText()} checkout...`);
    window.Paddle.Checkout.open({
      items: [
        {
          priceId,
          quantity: 1
        }
      ],
      ...(signedInUser?.email ? { customer: { email: signedInUser.email } } : {}),
      customData: {
        uid: signedInUser?.uid || "",
        product: "pmw-premium",
        plan: tier.name,
        billing: frequency
      },
      settings: {
        displayMode: "overlay",
        variant: "one-page",
        successUrl: absoluteUrl(PADDLE_CONFIG.successPath || "welcome/")
      }
    });
  } catch (error) {
    console.error("Unable to open Paddle checkout.", error);
    setMessage(error.message || "Paddle checkout is not available yet.", "error");
  }
}

frequencyButtons.forEach((button) => {
  button.addEventListener("click", () => {
    frequency = button.dataset.frequency;
    frequencyButtons.forEach((item) => item.classList.toggle("is-active", item === button));
    renderPricing();
  });
});

renderPricing();

onAuthStateChanged(auth, async (user) => {
  signedInUser = user;
  signedInPaddleCustomerId = "";
  isPremiumMember = user ? await isPremiumUser(user) : false;

  if (!user) {
    statusBox.textContent = "Sign in to prefill your email at checkout.";
  } else if (isPremiumMember) {
    statusBox.textContent = "Premium access is active for this account.";
  } else {
    statusBox.textContent = `Checkout will use ${user.email || "your signed-in email"}.`;
  }

  if (user) {
    try {
      const userSnap = await getDoc(doc(db, "users", user.uid));
      signedInPaddleCustomerId = userSnap.exists() ? userSnap.data().paddleCustomerId || "" : "";
    } catch (error) {
      console.warn("Unable to read Paddle customer ID for Paddle Retain.", error);
    }
  }

  renderPricing();
  loadLocalizedPrices();
});
