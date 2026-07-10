import { auth } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-auth.js";
import { isPremiumUser } from "./premium-access.js";

const badge = document.querySelector("#successBadge");
const title = document.querySelector("#successTitle");
const text = document.querySelector("#successText");

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    badge.textContent = "Signed Out";
    title.textContent = "Sign in to finish.";
    text.textContent = "Sign in with the account used for checkout so PMW Visuals can confirm premium access.";
    return;
  }

  const isPremium = await isPremiumUser(user);
  if (isPremium) {
    badge.textContent = "Premium Active";
    title.textContent = "Premium is active.";
    text.textContent = "Your account can now open the premium wallpaper area.";
    return;
  }

  badge.textContent = "Sync Pending";
  title.textContent = "Premium is syncing.";
  text.textContent = "If you just paid, wait a moment and refresh this page so Firebase can receive the Stripe update.";
});

