import admin from 'firebase-admin';
import fs from 'fs';

let firebaseInitialized = false;

export function initFirebase() {
  const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;

  if (serviceAccountPath && fs.existsSync(serviceAccountPath)) {
    try {
      const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
      firebaseInitialized = true;
      console.log('✅ [Firebase Admin] Initialized successfully with service account.');
    } catch (err) {
      console.warn(`[Firebase Admin Warning] Failed to initialize: ${err.message}. Operating in fallback push mode.`);
    }
  } else {
    console.log('ℹ️ [Firebase Admin Notice] No service account specified. FCM running in Real-Time Emulation / Socket mode.');
  }

  return firebaseInitialized;
}

export function isFirebaseReady() {
  return firebaseInitialized;
}

export const firebaseAdmin = admin;
