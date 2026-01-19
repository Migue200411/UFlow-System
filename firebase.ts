import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Configuration for UFlow System
// Uses environment variables in production, with fallback values for development
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyC534ghdsT1UpidjoTdAnv2lXcVkQCXTAw",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "uflow-f98ce.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "uflow-f98ce",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "uflow-f98ce.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "300510460590",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:300510460590:web:31edf3fc8a09168a918b3f"
};

// Initialize Firebase only once to prevent hot-reload errors
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export { auth, db, googleProvider };