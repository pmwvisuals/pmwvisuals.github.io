import { auth, db } from "./firebase.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js";

const nameEl = document.querySelector("#accountName");
const emailEl = document.querySelector("#accountEmail");
const planEl = document.querySelector("#accountPlan");
const msg = document.querySelector("#accountMessage");
const logoutBtn = document.querySelector("#logoutBtn");

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }

  nameEl.textContent = user.displayName || "PMW Member";
  emailEl.textContent = user.email;

  const snap = await getDoc(doc(db, "users", user.uid));
  const data = snap.exists() ? snap.data() : {};

  planEl.textContent = data.role === "member" ? "PMW Member" : "PMW Account";
  msg.textContent = "Account active.";
});

logoutBtn.addEventListener("click", async () => {
  await signOut(auth);
  window.location.href = "login.html";
});
