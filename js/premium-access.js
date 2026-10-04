import { db } from "./firebase.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js";

const PREMIUM_PLANS = ["creative", "premium", "business", "starter", "pro", "advanced", "advance", "elite"];
const ACCESS_STATUSES = ["active", "trialing"];
const PENDING_CHECKOUT_KEY = "pmw:pending-premium-checkout:v1";
const PENDING_DURATION_MS = 60 * 60 * 1000;

function normalizePlan(value) {
  const plan = String(value || "").toLowerCase();
  return PREMIUM_PLANS.includes(plan) ? plan : "";
}

function pendingPlanFor(user) {
  try {
    const pending = JSON.parse(localStorage.getItem(PENDING_CHECKOUT_KEY) || "null");
    if (pending?.uid === user.uid && pending.expiresAt > Date.now()) return normalizePlan(pending.plan) || "premium";
    if (pending && pending.expiresAt <= Date.now()) localStorage.removeItem(PENDING_CHECKOUT_KEY);
  } catch (error) {
    // Private browsing may disable local storage. Firestore will still update.
  }
  return "";
}

export function markCheckoutComplete(user, event) {
  const data = event?.data || {};
  const custom = data.custom_data || data.customData || {};
  if (!user || event?.name !== "checkout.completed" || custom.product !== "pmw-premium") return false;
  if (custom.uid && custom.uid !== user.uid) return false;
  if (data.status && !["completed", "paid"].includes(data.status)) return false;
  try {
    localStorage.setItem(PENDING_CHECKOUT_KEY, JSON.stringify({
      uid: user.uid,
      plan: normalizePlan(custom.plan) || "premium",
      transactionId: data.transaction_id || "",
      expiresAt: Date.now() + PENDING_DURATION_MS
    }));
    return true;
  } catch (error) {
    return false;
  }
}

export async function getPremiumPlan(user) {
  if (!user) return "";
  const pendingPlan = pendingPlanFor(user);

  try {
    const snap = await getDoc(doc(db, "users", user.uid));
    const data = snap.exists() ? snap.data() : {};
    const status = String(data.paddleSubscriptionStatus || "").toLowerCase();
    // A durable canceled/paused status must override temporary checkout access.
    if (status && !ACCESS_STATUSES.includes(status)) return "";
    if (status && ACCESS_STATUSES.includes(status)) {
      return normalizePlan(data.plan) || "premium";
    }
    if (pendingPlan) return pendingPlan;
    const plan = normalizePlan(data.plan);
    if (plan) return plan;
    if (data.premium === true || data.role === "premium") return "premium";
  } catch (error) {
    console.warn("Unable to read premium account status.", error);
  }

  if (pendingPlan) return pendingPlan;
  try {
    const token = await user.getIdTokenResult();
    const claims = token.claims || {};
    const claimPlan = normalizePlan(claims.plan);
    if (claimPlan) return claimPlan;
    if (claims.premium === true || claims.role === "premium") return "premium";
  } catch (error) {
    console.warn("Unable to read premium token claims.", error);
  }
  return "";
}

export async function isPremiumUser(user) {
  return Boolean(await getPremiumPlan(user));
}
