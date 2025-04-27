import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

// Initialize Firebase Admin SDK
function initFirebaseAdmin() {
  const apps = getApps();

  if (!apps.length) {
    // Get the private key
    let privateKey = process.env.FIREBASE_PRIVATE_KEY;

    // Handle different formats of the private key
    if (privateKey) {
      // If the key is JSON-stringified, parse it
      if (privateKey.startsWith('"') && privateKey.endsWith('"')) {
        privateKey = JSON.parse(privateKey);
      }

      // Replace literal \n with newlines if they exist
      privateKey = privateKey.replace(/\\n/g, "\n");
    }

    try {
      initializeApp({
        credential: cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey,
        }),
      });
    } catch (error) {
      console.error("Error initializing Firebase Admin:", error);
      throw error;
    }
  }

  return {
    auth: getAuth(),
    db: getFirestore(),
  };
}

export const { auth, db } = initFirebaseAdmin();