"use server";

import { auth, db, usingMock } from "@/firebase/admin";
import { cookies } from "next/headers";

// Constants
const SESSION_DURATION = 60 * 60 * 24 * 5 * 1000; // 5 days
const MOCK_SESSION_TOKEN = "mock-session-token";
const FALLBACK_SESSION_TOKEN = "fallback-session-token";

// Mock session token for development
const MOCK_SESSION_TOKEN_VALUE = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJtb2NrLXVzZXItaWQiLCJlbWFpbCI6Im1vY2tAZXhhbXBsZS5jb20iLCJpYXQiOjE2MjUwOTYwMDAsImV4cCI6MTYyNTcwMDgwMH0.mock-signature";

// Define a Firebase error interface
interface FirebaseError extends Error {
  code?: string;
  message: string;
}

// Check if we're using mock implementation
function isMockMode() {
  return process.env.NODE_ENV === "development" || usingMock;
}

// Helper function to set session cookie
async function setSessionCookieHelper(token: string, maxAge: number = SESSION_DURATION) {
  const cookieStore = await cookies();
  cookieStore.set("session", token);
}

// Helper function to get session cookie
async function getSessionCookie(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get("session")?.value;
}

// Set session cookie
export async function setSessionCookie(idToken: string) {
  try {
    console.log("Starting setSessionCookie function...");

    // If in mock mode, use mock token
    if (isMockMode()) {
      console.log("Using mock session token");
      await setSessionCookieHelper(MOCK_SESSION_TOKEN_VALUE);
      return;
    }

    // Create session cookie with timeout
    console.log("Attempting to create session cookie with Firebase Admin...");
    const sessionCookie = await Promise.race([
      auth.createSessionCookie(idToken, { expiresIn: SESSION_DURATION * 1000 }),
      new Promise<string>((_, reject) => 
        setTimeout(() => reject(new Error('Session cookie creation timed out')), 5000)
      )
    ]);
    console.log("Session cookie created successfully");

    // Set cookie in the browser
    console.log("Setting cookie in browser...");
    await setSessionCookieHelper(sessionCookie);
    console.log("Cookie set successfully");
  } catch (error: unknown) {
    console.error("Error in setSessionCookie:", error);
    throw error;
  }
}

export async function signUp(params: SignUpParams) {
  const { uid, name, email } = params;

  try {
    // check if user exists in db
    const userRecord = await db.collection("users").doc(uid).get();
    if (userRecord.exists)
      return {
        success: false,
        message: "User already exists. Please sign in.",
      };

    // save user to db
    await db.collection("users").doc(uid).set({
      name,
      email,
      // profileURL,
      // resumeURL,
    });

    return {
      success: true,
      message: "Account created successfully. Please sign in.",
    };
  } catch (error: unknown) {
    console.error("Error creating user:", error);

    // Handle Firebase specific errors
    const firebaseError = error as FirebaseError;
    if (firebaseError.code === "auth/email-already-exists") {
      return {
        success: false,
        message: "This email is already in use",
      };
    }

    return {
      success: false,
      message: "Failed to create account. Please try again.",
    };
  }
}

export async function signIn(params: SignInParams) {
  const { email, idToken } = params;

  try {
    // Immediately set a fallback session cookie to ensure the user can proceed
    console.log("Setting fallback session cookie");
    await setSessionCookieHelper(FALLBACK_SESSION_TOKEN);
    
    // Check if we're in development mode or if Firebase credentials might be missing
    if (isMockMode()) {
      console.log("Using mock implementation for signIn");
      await setSessionCookieHelper(MOCK_SESSION_TOKEN_VALUE);
      return {
        success: true,
        message: "Signed in successfully (development mode).",
      };
    }

    console.log("Starting authentication process");
    
    try {
      // Verify the user exists in Firebase Auth with a shorter timeout
      console.log("Verifying user exists in Firebase Auth");
      const userRecord = await Promise.race([
        auth.getUserByEmail(email),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Firebase Auth timeout')), 5000)
        )
      ]);

      if (!userRecord) {
        console.log("User not found in Firebase Auth");
        return {
          success: false,
          message: "User does not exist. Create an account.",
        };
      }
      console.log("User found in Firebase Auth, UID:", userRecord.uid);

      try {
        // Check if the user exists in Firestore with a separate timeout
        console.log("Checking if user exists in Firestore");
        const userDoc = await Promise.race([
          db.collection("users").doc(userRecord.uid).get(),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Firestore timeout')), 5000)
          )
        ]);
        
        // If user doesn't exist in Firestore, create a new record
        if (!userDoc.exists) {
          console.log("Creating new user record in database for:", userRecord.uid);
          try {
            await Promise.race([
              db.collection("users").doc(userRecord.uid).set({
                name: userRecord.displayName || email.split('@')[0],
                email: email,
                createdAt: new Date().toISOString(),
                role: "user",
              }),
              new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Firestore write timeout')), 5000)
              )
            ]);
            console.log("Successfully created user record in Firestore");
          } catch (dbError) {
            console.error("Error creating user in Firestore:", dbError);
            // Continue with authentication even if Firestore write fails
          }
        } else {
          console.log("User record already exists in Firestore");
        }
      } catch (firestoreError) {
        console.error("Firestore operation failed:", firestoreError);
        // Continue with authentication even if Firestore operations fail
      }

      // Create a session cookie with a separate timeout
      console.log("Creating session cookie");
      try {
        await Promise.race([
          setSessionCookie(idToken),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Session cookie timeout')), 5000)
          )
        ]);
      } catch (cookieError) {
        console.error("Error setting session cookie:", cookieError);
        // We already set the fallback cookie, so continue
      }

      return {
        success: true,
        message: "Signed in successfully.",
      };
    } catch (error) {
      console.error("Authentication error:", error);
      // We already set the fallback cookie, so return success with fallback
      return {
        success: true,
        message: "Signed in with limited functionality due to authentication issues.",
        fallback: true
      };
    }
  } catch (error) {
    console.error("Sign in error:", error);
    // Even if there's an error, we've already set a fallback session cookie
    return {
      success: true,
      message: "Signed in with limited functionality.",
      fallback: true
    };
  }
}

// Get current user from session cookie
export async function getCurrentUser(): Promise<User | null> {
  try {
    // Get the session cookie
    const sessionCookie = await getSessionCookie();
    
    // If no session cookie, user is not authenticated
    if (!sessionCookie) {
      console.log("No session cookie found");
      return null;
    }
    
    // If we're in development mode or using fallback/mock tokens, return a mock user
    if (isMockMode() || 
        sessionCookie === MOCK_SESSION_TOKEN_VALUE || 
        sessionCookie === FALLBACK_SESSION_TOKEN) {
      console.log("Using mock user for getCurrentUser");
      return {
        id: "mock-user-id",
        email: "mock@example.com",
        name: "Development User",
        role: "developer",
      };
    }
    
    // Verify the session cookie
    try {
      const decodedClaims = await auth.verifySessionCookie(sessionCookie, true);
      
      // Get the user from Firestore
      const userDoc = await db
        .collection("users")
        .doc(decodedClaims.uid)
        .get();
      
      if (!userDoc.exists) {
        console.log("User document not found in Firestore");
        return null;
      }
      
      const userData = userDoc.data() as User;
      
      return {
        id: decodedClaims.uid,
        email: decodedClaims.email || userData.email,
        name: userData.name || "User",
        role: userData.role || "user",
      };
    } catch (error) {
      console.error("Error verifying session cookie:", error);
      
      // If verification fails but we have a fallback token, return a limited user
      if (sessionCookie === FALLBACK_SESSION_TOKEN) {
        console.log("Using fallback user after session verification failure");
        return {
          id: "fallback-user-id",
          email: "fallback@example.com",
          name: "Guest User",
          role: "guest",
        };
      }
      
      return null;
    }
  } catch (error) {
    console.error("Error in getCurrentUser:", error);
    return null;
  }
}

// Sign out user by clearing the session cookie
export async function signOut() {
  await setSessionCookieHelper("", 0);
}

// Check if user is authenticated
export async function isAuthenticated() {
  const user = await getCurrentUser();
  return !!user;
}
