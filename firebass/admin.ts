import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

// Check if we're running in a CI environment
const isCI = process.env.CI === 'true';

// Mock implementations for CI environment
class MockFirestore {
  collection() {
    return {
      doc: () => ({
        get: async () => ({ exists: false, data: () => ({}) }),
        set: async () => {},
        update: async () => {},
        delete: async () => {},
      }),
      where: () => ({
        get: async () => ({ docs: [] }),
        orderBy: () => ({
          get: async () => ({ docs: [] }),
          limit: () => ({
            get: async () => ({ docs: [] }),
          }),
        }),
        limit: () => ({
          get: async () => ({ docs: [] }),
        }),
      }),
      orderBy: () => ({
        get: async () => ({ docs: [] }),
        limit: () => ({
          get: async () => ({ docs: [] }),
        }),
      }),
      limit: () => ({
        get: async () => ({ docs: [] }),
      }),
      get: async () => ({ docs: [] }),
      add: async () => ({ id: 'mock-id' }),
    };
  }
}

class MockAuth {
  verifyIdToken() {
    return Promise.resolve({ uid: 'mock-user-id' });
  }
  getUser() {
    return Promise.resolve({ uid: 'mock-user-id', email: 'mock@example.com' });
  }
}

// Initialize Firebase Admin SDK
function initFirebaseAdmin() {
  // If we're in a CI environment, return mock implementations
  if (isCI) {
    console.log('CI environment detected, using mock Firebase implementations');
    return {
      auth: new MockAuth(),
      db: new MockFirestore(),
    };
  }

  const apps = getApps();

  if (!apps.length) {
    // Get the private key
    let privateKey = process.env.FIREBASE_PRIVATE_KEY;

    // Check if required environment variables are present
    if (!process.env.FIREBASE_PROJECT_ID || !process.env.FIREBASE_CLIENT_EMAIL || !privateKey) {
      console.warn('Missing Firebase Admin SDK credentials. Using mock implementations.');
      return {
        auth: new MockAuth(),
        db: new MockFirestore(),
      };
    }

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
      console.warn('Using mock implementations due to initialization error');
      return {
        auth: new MockAuth(),
        db: new MockFirestore(),
      };
    }
  }

  return {
    auth: getAuth(),
    db: getFirestore(),
  };
}

export const { auth, db } = initFirebaseAdmin();