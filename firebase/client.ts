// Import the functions you need from the SDKs you need
import { getApp, getApps, initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCjra5dwOtJAYLjlJBlTXNE2uWjxNC1kDk",
  authDomain: "prewise-6f44b.firebaseapp.com",
  projectId: "prewise-6f44b",
  storageBucket: "prewise-6f44b.firebasestorage.app",
  messagingSenderId: "424923985679",
  appId: "1:424923985679:web:67e047a76cbda4f2a9b07a",
  measurementId: "G-LF4L1E9D22"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const analytics = getAnalytics(app);

export const auth = getAuth(app);
export const db = getFirestore(app);
