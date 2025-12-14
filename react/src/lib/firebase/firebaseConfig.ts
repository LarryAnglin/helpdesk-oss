/*
 * Copyright (c) 2025 anglinAI All Rights Reserved
 */

import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getFunctions } from 'firebase/functions';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);
const functions = getFunctions(app, 'us-central1');

// Connect to Firestore emulator in development
if (import.meta.env.DEV && !('__FIRESTORE_EMULATOR_CONNECTED__' in globalThis)) {
  try {
    connectFirestoreEmulator(db, 'localhost', 8080);
    (globalThis as any).__FIRESTORE_EMULATOR_CONNECTED__ = true;
    console.log('Connected to Firestore emulator');
  } catch (error) {
    console.log('Firestore emulator connection failed or already connected');
  }
}

export { app, auth, db, storage, functions };