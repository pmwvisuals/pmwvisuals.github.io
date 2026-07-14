import { db } from "./firebase.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js";

export async function isPremiumUser(user) {
  if (!user) return false;

  try {
    const token = await user.getIdTokenResult(true);
    const claims = token.claims || {};
    const claimPlan = String(claims.plan || "").toLowerCase();
    if (
      claims.premium === true ||
      claims.role === "premium" ||
      ["creative", "premium", "business"].includes(claimPlan)
    ) {
      return true;
    }
  } catch (error) {
    console.warn("Unable to read premium token claims.", error);
  }

  try {
    const snap = await getDoc(doc(db, "users", user.uid));
    const data = snap.exists() ? snap.data() : {};
    const plan = String(data.plan || "").toLowerCase();
    return data.premium === true || data.role === "premium" || ["creative", "premium", "business"].includes(plan);
  } catch (error) {
    console.warn("Unable to read premium account status.", error);
    return false;
  }
}
