import { auth, db } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js";

const statusBox = document.querySelector("#premiumStatus");

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    statusBox.textContent = "Sign in to check premium access.";
    return;
  }
  const snap = await getDoc(doc(db, "users", user.uid));
  const data = snap.exists() ? snap.data() : {};
  const isPremium = data.premium === true || data.role === "premium";
  document.body.classList.toggle("is-premium", isPremium);
  statusBox.textContent = isPremium ? "Premium unlocked." : "You are signed in with a free account.";
});
