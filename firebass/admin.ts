import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

// Check if we're running in a CI environment or Vercel build environment
const isCI = process.env.CI === 'true';
// We only want to use mocks during the build phase, not during runtime
const isVercelBuild = process.env.VERCEL_ENV === 'production' && process.env.VERCEL_REGION === undefined;
const shouldUseMocks = isCI || isVercelBuild;

console.log('Environment check:', {
  isCI,
  isVercelBuild,
  shouldUseMocks,
  NODE_ENV: process.env.NODE_ENV,
  VERCEL_ENV: process.env.VERCEL_ENV,
  VERCEL_REGION: process.env.VERCEL_REGION
});

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
    return Promise.resolve({ uid: 'mock-user-id', email: 'mock@example.com' });
  }

  getUser() {
    return Promise.resolve({ uid: 'mock-user-id', email: 'mock@example.com' });
  }

  getUserByEmail() {
    return Promise.resolve({ uid: 'mock-user-id', email: 'mock@example.com' });
  }

  createSessionCookie() {
    return Promise.resolve('mock-session-cookie');
  }

  verifySessionCookie() {
    return Promise.resolve({ uid: 'mock-user-id', email: 'mock@example.com' });
  }
}

// Initialize Firebase Admin SDK
function initFirebaseAdmin() {
  // If we're in a CI environment or Vercel build, return mock implementations
  if (shouldUseMocks) {
    console.log('CI or Vercel build environment detected, using mock Firebase implementations');
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
      console.warn('Project ID:', process.env.FIREBASE_PROJECT_ID ? 'present' : 'missing');
      console.warn('Client Email:', process.env.FIREBASE_CLIENT_EMAIL ? 'present' : 'missing');
      console.warn('Private Key:', privateKey ? 'present' : 'missing');
      return {
        auth: new MockAuth(),
        db: new MockFirestore(),
      };
    }

    // Handle different formats of the private key
    if (privateKey) {
      console.log('Processing private key...');

      // If the key is JSON-stringified, parse it
      if (privateKey.startsWith('"') && privateKey.endsWith('"')) {
        console.log('Private key is JSON-stringified, parsing...');
        privateKey = JSON.parse(privateKey);
      }

      // Replace literal \n with newlines if they exist
      if (privateKey.includes('\\n')) {
        console.log('Replacing \\n with newlines in private key...');
        privateKey = privateKey.replace(/\\n/g, "\n");
      }

      // Log the first and last few characters of the private key for debugging
      if (privateKey.length > 20) {
        console.log(`Private key starts with: ${privateKey.substring(0, 10)}...`);
        console.log(`Private key ends with: ...${privateKey.substring(privateKey.length - 10)}`);
      }
    }

    try {
      console.log('Initializing Firebase Admin SDK...');
      initializeApp({
        credential: cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey,
        }),
      });
      console.log('Firebase Admin SDK initialized successfully');
    } catch (error) {
      console.error("Error initializing Firebase Admin:", error);

      // Log more details about the error
      if (error instanceof Error) {
        console.error("Error message:", error.message);
        console.error("Error stack:", error.stack);
      }

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