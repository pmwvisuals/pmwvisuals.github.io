import { db } from "./firebase.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js";

const PREMIUM_PLANS = ["creative", "premium", "business", "starter", "pro", "advanced", "advance", "elite"];

function normalizePlan(value) {
  const plan = String(value || "").toLowerCase();
  return PREMIUM_PLANS.includes(plan) ? plan : "";
}

export async function getPremiumPlan(user) {
  if (!user) return false;

  try {
    const token = await user.getIdTokenResult(true);
    const claims = token.claims || {};
    const claimPlan = normalizePlan(claims.plan);
    if (claimPlan) return claimPlan;
    if (
      claims.premium === true ||
      claims.role === "premium"
    ) {
      return "premium";
    }
  } catch (error) {
    console.warn("Unable to read premium token claims.", error);
  }

  try {
    const snap = await getDoc(doc(db, "users", user.uid));
    const data = snap.exists() ? snap.data() : {};
    const plan = normalizePlan(data.plan);
    if (plan) return plan;
    return data.premium === true || data.role === "premium" ? "premium" : "";
  } catch (error) {
    console.warn("Unable to read premium account status.", error);
    return "";
  }
}

export async function isPremiumUser(user) {
  return Boolean(await getPremiumPlan(user));
}
