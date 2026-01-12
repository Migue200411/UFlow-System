import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Configuration for UFlow System
const firebaseConfig = {
  apiKey: "AIzaSyC534ghdsT1UpidjoTdAnv2lXcVkQCXTAw",
  authDomain: "uflow-f98ce.firebaseapp.com",
  projectId: "uflow-f98ce",
  storageBucket: "uflow-f98ce.firebasestorage.app",
  messagingSenderId: "300510460590",
  appId: "1:300510460590:web:31edf3fc8a09168a918b3f"
};

// Initialize Firebase only once to prevent hot-reload errors
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

export { auth, db, googleProvider };