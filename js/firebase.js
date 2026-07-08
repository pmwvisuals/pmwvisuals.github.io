import { initializeApp } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBMIYLKrny-4_FukQWmKufftBu7KlZFDuk",
  authDomain: "pmw-visuals-b14e8.firebaseapp.com",
  projectId: "pmw-visuals-b14e8",
  storageBucket: "pmw-visuals-b14e8.firebasestorage.app",
  messagingSenderId: "549489847486",
  appId: "1:549489847486:web:a9936e9a063d900c9482ef",
  measurementId: "G-GJ0J2433TN"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
