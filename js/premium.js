import { auth } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-auth.js";
import { isPremiumUser } from "./premium-access.js";

const statusBox = document.querySelector("#premiumStatus");
const checkoutBtn = document.querySelector("#checkoutBtn");
const message = document.querySelector("#premiumMessage");

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    statusBox.textContent = "Sign in first, then return here to upgrade.";
    checkoutBtn.textContent = "Sign In To Continue";
    checkoutBtn.disabled = false;
    checkoutBtn.addEventListener("click", () => {
      window.location.href = "login.html";
    }, { once: true });
    return;
  }

  const isPremium = await isPremiumUser(user);
  if (isPremium) {
    statusBox.textContent = "Premium access is active for this account.";
    checkoutBtn.textContent = "Open Premium Wallpapers";
    checkoutBtn.disabled = false;
    checkoutBtn.addEventListener("click", () => {
      window.location.href = "premium-wallpapers.html";
    }, { once: true });
    message.textContent = "You can open the premium area from this page.";
    return;
  }

  statusBox.textContent = "You are signed in as a free member.";
  message.textContent = "Stripe Checkout will be connected in Phase 2.";
});

