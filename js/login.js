import { auth } from "./firebase.js";
import { signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-auth.js";

const form = document.querySelector("#loginForm");
const msg = document.querySelector("#authMessage");

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  msg.textContent = "Signing in...";
  msg.className = "pmw-message";

  const email = document.querySelector("#email").value.trim();
  const password = document.querySelector("#password").value;

  try {
    await signInWithEmailAndPassword(auth, email, password);
    msg.textContent = "Signed in. Redirecting...";
    msg.className = "pmw-message success";
    setTimeout(() => window.location.href = "account.html", 600);
  } catch (error) {
    msg.textContent = error.message.replace("Firebase: ", "");
    msg.className = "pmw-message error";
  }
});
