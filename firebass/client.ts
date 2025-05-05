// Import the functions you need from the SDKs you need
import { initializeApp, getApp, getApps } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
// Import our custom error handler and popup handler
import { isPopupClosedError, handleFirebaseAuthError } from "./errorHandler";
import { customSignInWithPopup } from "./customPopup";



// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
//
// NOTE: Firebase API keys are designed to be public and used in client-side code.
// They are not secret credentials. Security is enforced through Firebase Security Rules
// and domain restrictions, not by keeping the API key private.
// See: https://firebase.google.com/docs/projects/api-keys

// Ensure we have fallback values for development
// Get the current hostname for better domain handling
const currentHostname = typeof window !== 'undefined' ? window.location.hostname : 'server-side';

// Determine if we're in a development environment
const isDevelopment = process.env.NODE_ENV === 'development' ||
                     currentHostname === 'localhost' ||
                     currentHostname === '127.0.0.1';

// For development on localhost, use localhost as the auth domain
// For all other environments, use the configured domain from env vars
const authDomain = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "prewise-6f44b.firebaseapp.com";

console.log('Current environment:', process.env.NODE_ENV);
console.log('Current hostname:', currentHostname);
console.log('Using auth domain:', authDomain);

// Log the current hostname for debugging
console.log('Current hostname for Firebase config:', currentHostname);

const firebaseConfig = {
  // These values are intentionally public and designed to be included in client-side code
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyCjra5dwOtJAYLjlJBlTXNE2uWjxNC1kDk",
  authDomain: authDomain,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "prewise-6f44b",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "prewise-6f44b.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "424923985679",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:424923985679:web:67e047a76cbda4f2a9b07a",
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || "G-LF4L1E9D22"
};

// Initialize Firebase with error handling
let app;
let auth;
let db;
let provider;

try {
  // Initialize Firebase without checking environment variables
  // We're using hardcoded fallback values in firebaseConfig
  app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

  provider = new GoogleAuthProvider();
  // Add scopes for Google provider
  provider.addScope('profile');
  provider.addScope('email');

  auth = getAuth(app);
  auth.languageCode = 'en';

  // Set persistence to local for better user experience
  if (typeof window !== 'undefined') {
    import('firebase/auth').then(({ setPersistence, browserLocalPersistence }) => {
      setPersistence(auth, browserLocalPersistence)
        .catch(error => {
          console.warn('Error setting persistence:', error);
        });
    });
  }

  db = getFirestore(app);

  // Check for redirect result on page load
  if (typeof window !== 'undefined' && localStorage.getItem('auth_redirect_pending')) {
    import('firebase/auth').then(({ getRedirectResult }) => {
      getRedirectResult(auth)
        .then(result => {
          if (result) {
            console.log('Redirect authentication successful');
            localStorage.removeItem('auth_redirect_pending');
          }
        })
        .catch(error => {
          console.error('Error with redirect result:', error);
          localStorage.removeItem('auth_redirect_pending');
        });
    });
  }
} catch (error) {
  console.error('Error initializing Firebase client:', error);

  // Create mock implementations for development/fallback
  if (typeof window !== 'undefined') {
    console.warn('Using mock Firebase implementation');
  }
}

export { provider, auth, db };

export const signInWithGoogle = async () => {
  try {
    // Check if Firebase auth is initialized
    if (!auth || !provider) {
      console.error("Firebase auth is not initialized");
      throw new Error("Authentication service is not available");
    }

    // Log the current hostname for debugging
    if (typeof window !== 'undefined') {
      console.log('Current hostname:', window.location.hostname);
      console.log('Current origin:', window.location.origin);
    }

    // Use our custom popup handler
    let result;
    try {
      result = await customSignInWithPopup(auth, provider);
    } catch (popupError: any) {
      // If we get an unauthorized domain error, show a helpful message
      if (popupError.code === 'auth/unauthorized-domain') {
        console.error('Domain not authorized in Firebase. Please add the following domains to your Firebase console:');
        console.error('- localhost');
        console.error('- 127.0.0.1');
        console.error('- ' + window.location.hostname);

        // In development, we can create a mock user for testing
        if (process.env.NODE_ENV === 'development') {
          console.log('Creating mock user for development testing');
          return {
            user: {
              uid: 'mock-uid-' + Date.now(),
              displayName: 'Mock User',
              email: 'mock@example.com',
              photoURL: 'https://ui-avatars.com/api/?name=Mock+User&background=random',
              getIdToken: () => Promise.resolve('mock-token')
            },
            token: 'mock-token',
            idToken: 'mock-id-token'
          };
        }

        throw popupError;
      }
      throw popupError;
    }

    // If the result is null, the user closed the popup
    if (!result) {
      console.log("User closed the sign-in popup window");
      return null;
    }

    const credential = GoogleAuthProvider.credentialFromResult(result);
    const token = credential?.accessToken;
    const user = result.user;

    if (!user) {
      throw new Error("Failed to get user from authentication result");
    }

    const idToken = await user.getIdToken();

    // Send to server to store in DB and set session
    try {
      // Import the getApiUrl function dynamically to avoid circular dependencies
      const { getApiUrl } = await import('@/lib/utils/apiUrl');

      // Use the getApiUrl function to get the correct URL for the current environment
      const apiUrl = getApiUrl('/api/google-auth');
      console.log(`Making request to: ${apiUrl}`);

      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          uid: user.uid,
          name: user.displayName,
          email: user.email,
          photoURL: user.photoURL, // Include the user's Google profile photo
          idToken,
        }),
      });

      // Parse the response
      const responseData = await response.json().catch(e => {
        console.error("Error parsing response:", e);
        return null;
      });

      console.log("API response:", response.status, responseData);

      if (!response.ok) {
        console.warn("Server session creation failed:", responseData?.message || "Unknown error");

        // If the server returns a 500 error or we're instructed to use a local session,
        // create a local session instead
        if (response.status === 500 || responseData?.useLocalSession) {
          console.log("Creating local session as fallback for server error");

          // Store the user info in localStorage as a fallback
          try {
            localStorage.setItem('auth_user', JSON.stringify({
              uid: user.uid,
              email: user.email,
              displayName: user.displayName,
              photoURL: user.photoURL,
              isLocalSession: true, // Flag to indicate this is a local session
            }));

            console.log("Local session created successfully");
          } catch (localStorageError) {
            console.error("Error creating local session:", localStorageError);
          }
        }
      } else if (responseData?.useLocalSession) {
        // The server explicitly told us to use a local session
        console.log("Server instructed to use local session");

        try {
          localStorage.setItem('auth_user', JSON.stringify({
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
            photoURL: user.photoURL,
            isLocalSession: true,
          }));

          console.log("Local session created successfully");
        } catch (localStorageError) {
          console.error("Error creating local session:", localStorageError);
        }
      }
    } catch (serverError) {
      console.error("Error communicating with server:", serverError);
      // Continue anyway - the user is authenticated on the client side
    }

    return { user, token, idToken }; // ✅ returning all
  } catch (error) {
    // Use our custom error handler to get a user-friendly message
    const errorMessage = handleFirebaseAuthError(error);

    // If it's a popup closed error, our handler returns an empty string
    if (!errorMessage) {
      return null;
    }

    // For all other errors, throw with the friendly message
    throw new Error(errorMessage);
  }
};
