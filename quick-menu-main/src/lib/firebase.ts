import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyBnD0Ar1JLLt2L218kbrkfBtyDjBVoLnJY",
  authDomain: "quick-menu-8e1ab.firebaseapp.com",
  projectId: "quick-menu-8e1ab",
  storageBucket: "quick-menu-8e1ab.firebasestorage.app",
  messagingSenderId: "412457421950",
  appId: "1:412457421950:web:6b185f4049fb1d82871c2f",
  measurementId: "G-E69JQ0ZT36"
};

const app = initializeApp(firebaseConfig);
export const analytics = getAnalytics(app);
export const db = getFirestore(app);
