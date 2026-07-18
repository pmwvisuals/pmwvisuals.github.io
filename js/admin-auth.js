import { auth, db } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js";

export async function isAdminUser(user) {
  if (!user) return false;

  try {
    const snap = await getDoc(doc(db, "admins", user.uid));
    return snap.exists();
  } catch (error) {
    console.warn("Unable to verify admin access.", error);
    return false;
  }
}

export function requireAdmin({ onAllowed, onDenied, loginUrl = "admin-login.html" } = {}) {
  return onAuthStateChanged(auth, async (user) => {
    if (!user) {
      window.location.replace(loginUrl);
      return;
    }

    const isAdmin = await isAdminUser(user);
    if (!isAdmin) {
      if (onDenied) onDenied(user);
      return;
    }

    if (onAllowed) onAllowed(user);
  });
}
