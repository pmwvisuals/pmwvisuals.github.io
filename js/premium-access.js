import { db } from "./firebase.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js";

export async function isPremiumUser(user) {
  if (!user) return false;

  try {
    const token = await user.getIdTokenResult(true);
    const claims = token.claims || {};
    if (
      claims.premium === true ||
      claims.role === "premium"
    ) {
      return true;
    }
  } catch (error) {
    console.warn("Unable to read premium token claims.", error);
  }

  try {
    const snap = await getDoc(doc(db, "users", user.uid));
    const data = snap.exists() ? snap.data() : {};
    return data.premium === true || data.role === "premium" || data.plan === "premium";
  } catch (error) {
    console.warn("Unable to read premium account status.", error);
    return false;
  }
}
