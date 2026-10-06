import { initializeApp, getApps, getApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyChrUuEEX7ZN04U-7wnZeS98Te7ZwkOCig",
  authDomain: "dt-project-522f4.firebaseapp.com",
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL || "https://dt-project-522f4-default-rtdb.firebaseio.com",
  projectId: "dt-project-522f4",
  storageBucket: "dt-project-522f4.firebasestorage.app",
  messagingSenderId: "542385150247",
  appId: "1:542385150247:web:9beaa1ff1b559286eb9706"
};

// Singleton initialization
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const database = getDatabase(app);
const auth = getAuth(app);

// Authenticate anonymously so RTDB rules permit reading and writing telemetry & commands
let authPromise = null;

export const ensureAuthenticated = () => {
  if (auth.currentUser) {
    return Promise.resolve(auth.currentUser);
  }
  if (!authPromise) {
    authPromise = signInAnonymously(auth)
      .then((cred) => {
        console.info("[Firebase] Authenticated anonymously as:", cred.user.uid);
        return cred.user;
      })
      .catch((err) => {
        console.error("[Firebase] Anonymous auth error:", err);
        authPromise = null;
        throw err;
      });
  }
  return authPromise;
};

// Eagerly trigger authentication
ensureAuthenticated().catch(() => {});

export { app, database, auth };
export default app;
