import { auth } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-auth.js";
import { isPremiumUser } from "./premium-access.js";

const badge = document.querySelector("#premiumGateBadge");
const title = document.querySelector("#premiumGateTitle");
const text = document.querySelector("#premiumGateText");
const primaryBtn = document.querySelector("#premiumPrimaryBtn");

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    badge.textContent = "Signed Out";
    title.textContent = "Sign in required";
    text.textContent = "Create an account or sign in before accessing premium wallpapers.";
    primaryBtn.textContent = "Sign In / Up";
    primaryBtn.href = "login.html";
    return;
  }

  const isPremium = await isPremiumUser(user);
  if (isPremium) {
    badge.textContent = "Premium Active";
    title.textContent = "Premium collection ready";
    text.textContent = "You have premium access. Add protected premium wallpapers later and they will appear here.";
    primaryBtn.textContent = "Open Account";
    primaryBtn.href = "account.html";
    document.body.classList.add("is-premium-member");
    return;
  }

  badge.textContent = "Free Member";
  title.textContent = "Premium access required";
  text.textContent = "Upgrade to premium when checkout is connected to unlock private wallpaper downloads.";
});

