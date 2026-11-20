"use client";

import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import {
  doc,
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  type Firestore,
} from "firebase/firestore";

// Public web config: access is guarded by Firestore rules (one account only)
// and by sign-ups being disabled, not by keeping these values secret.
const config = {
  apiKey: "AIzaSyA512U50dnfYp9oszPpP6EHhZS9ZHmsJbA",
  authDomain: "eyeson-pirus.firebaseapp.com",
  projectId: "eyeson-pirus",
  storageBucket: "eyeson-pirus.firebasestorage.app",
  messagingSenderId: "856178923113",
  appId: "1:856178923113:web:81a0cca7f68eba27fcb4f8",
};

/** The single account; the login screen only asks for its password. */
export const ACCOUNT_EMAIL = "ben@eyeson.app";

const app = getApps().length ? getApp() : initializeApp(config);

export const auth = getAuth(app);

function makeDb(): Firestore {
  try {
    // Offline edits are queued on the device and sent when it's back online.
    return initializeFirestore(app, {
      localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
    });
  } catch {
    return getFirestore(app);
  }
}

export const db = makeDb();

/** Everything lives in one document as a JSON string (Firestore rejects
 * `undefined` fields, which the records use freely). */
export const dataDoc = doc(db, "veri", "ana");
