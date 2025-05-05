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
const firebaseConfig = {
  // These values are intentionally public and designed to be included in client-side code
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyCjra5dwOtJAYLjlJBlTXNE2uWjxNC1kDk",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "prewise-6f44b.firebaseapp.com",
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
  auth = getAuth(app);
  auth.languageCode = 'en';
  db = getFirestore(app);
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

    // Use our custom popup handler
    const result = await customSignInWithPopup(auth, provider);

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

      if (!response.ok) {
        const errorText = await response.text();
        console.warn("Server session creation failed:", errorText);

        // If we're in production and the server returns a 500 error,
        // we'll create a local session instead
        if (response.status === 500) {
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
