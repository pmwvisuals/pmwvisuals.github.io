import { auth } from "./firebase.js";
import { isAdminUser } from "./admin-auth.js";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut
} from "https://www.gstatic.com/firebasejs/12.15.0/firebase-auth.js";

const form = document.querySelector("#adminLoginForm");
const emailInput = document.querySelector("#adminEmail");
const passwordInput = document.querySelector("#adminPassword");
const message = document.querySelector("#adminMessage");
const submitButton = document.querySelector("#adminLoginButton");

function setMessage(text, type = "") {
  message.textContent = text;
  message.className = type ? `admin-message ${type}` : "admin-message";
}

onAuthStateChanged(auth, async (user) => {
  if (!user) return;

  setMessage("Checking admin access...");
  const isAdmin = await isAdminUser(user);
  if (isAdmin) {
    window.location.replace("admin.html");
    return;
  }

  await signOut(auth);
  setMessage("This account does not have admin access.", "error");
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  setMessage("Signing in...");
  submitButton.disabled = true;

  try {
    const credential = await signInWithEmailAndPassword(
      auth,
      emailInput.value.trim(),
      passwordInput.value
    );

    const isAdmin = await isAdminUser(credential.user);
    if (!isAdmin) {
      await signOut(auth);
      setMessage("This account does not have admin access.", "error");
      return;
    }

    setMessage("Admin access confirmed. Redirecting...", "success");
    window.location.replace("admin.html");
  } catch (error) {
    setMessage(error.message.replace("Firebase: ", ""), "error");
  } finally {
    submitButton.disabled = false;
    passwordInput.value = "";
  }
});
