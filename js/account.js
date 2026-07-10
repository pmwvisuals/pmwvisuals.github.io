import { auth } from "./firebase.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-auth.js";
import { isPremiumUser } from "./premium-access.js";

const nameEl = document.querySelector("#accountName");
const emailEl = document.querySelector("#accountEmail");
const planEl = document.querySelector("#accountPlan");
const msg = document.querySelector("#accountMessage");
const logoutBtn = document.querySelector("#logoutBtn");
const premiumAction = document.querySelector("#premiumAction");
const accountTierStat = document.querySelector("#accountTierStat");

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }

  nameEl.textContent = user.displayName || "PMW Member";
  emailEl.textContent = user.email;

  const isPremium = await isPremiumUser(user);
  planEl.textContent = isPremium ? "Premium Member" : "Free Member";
  msg.textContent = isPremium ? "Premium access active." : "Free account active.";
  accountTierStat.textContent = isPremium ? "Premium" : "Free";
  if (isPremium) {
    premiumAction.textContent = "Open Premium";
    premiumAction.href = "premium-wallpapers.html";
  }
});

logoutBtn.addEventListener("click", async () => {
  await signOut(auth);
  window.location.href = "login.html";
});
