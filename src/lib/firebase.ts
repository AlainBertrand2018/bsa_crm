import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { initializeFirestore, getFirestore, Firestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

// Initialize Firebase
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);

// Set auth persistence to SESSION (not LOCAL)
// This means users will be logged out when they close the tab/browser
// Use SESSION instead of LOCAL to avoid persistent sessions
if (typeof window !== 'undefined') {
    import('firebase/auth').then(({ setPersistence, browserSessionPersistence }) => {
        setPersistence(auth, browserSessionPersistence).catch((error) => {
            console.error('[Firebase] Error setting persistence:', error);
        });
    });
}

// Use initializeFirestore with settings to fix "Could not reach Cloud Firestore backend"
let db: Firestore;
try {
    // Try to initialize with forced long polling FIRST
    db = initializeFirestore(app, {
        experimentalForceLongPolling: true,
    });
    console.log("[Firebase] Initialized Firestore with experimentalForceLongPolling: true");
} catch (e: any) {
    // If it's already initialized (e.g. fast refresh), use the existing instance
    if (e.code === 'failed-precondition' || e.message.includes('already exists')) {
        console.warn("[Firebase] Firestore already initialized, using existing instance.");
        db = getFirestore(app);
    } else {
        console.error("[Firebase] Error initializing Firestore:", e);
        throw e;
    }
}

// Debug logs (Safe as they only show if values are present, not the keys themselves)
if (typeof window !== 'undefined') {
    const isConfigMissing = !firebaseConfig.apiKey || !firebaseConfig.projectId;
    if (isConfigMissing) {
        console.warn("[Firebase] Configuration is missing! Check your .env file and RESTART your dev server.");
    } else {
        console.log("[Firebase] Configuration loaded successfully.");
    }
}

const storage = getStorage(app);

export { app, auth, db, storage };
