import { auth, db } from "./firebase.js";
import { createUserWithEmailAndPassword, updateProfile } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-auth.js";
import { doc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js";

const form = document.querySelector("#signupForm");
const msg = document.querySelector("#authMessage");

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  msg.textContent = "Creating your account...";
  msg.className = "pmw-message";

  const name = document.querySelector("#name").value.trim();
  const email = document.querySelector("#email").value.trim();
  const password = document.querySelector("#password").value;

  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(userCredential.user, { displayName: name });
    await setDoc(doc(db, "users", userCredential.user.uid), {
      name,
      email,
      role: "member",
      createdAt: serverTimestamp()
    });
    msg.textContent = "Account created. Redirecting...";
    msg.className = "pmw-message success";
    setTimeout(() => window.location.href = "account.html", 700);
  } catch (error) {
    msg.textContent = error.message.replace("Firebase: ", "");
    msg.className = "pmw-message error";
  }
});
