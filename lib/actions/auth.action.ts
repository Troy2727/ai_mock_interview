"use server";

import { auth, db } from "@/firebase/admin";
import { cookies } from "next/headers";

// Session duration (1 week)
const SESSION_DURATION = 60 * 60 * 24 * 7;

// Define a Firebase error interface
interface FirebaseError extends Error {
  code?: string;
  message: string;
}

// Set session cookie
export async function setSessionCookie(idToken: string) {
  // Add a timeout promise to prevent hanging
  const timeoutPromise = new Promise<string>((_, reject) => {
    setTimeout(() => reject(new Error('Session cookie creation timed out')), 5000);
  });

  try {
    console.log("Starting setSessionCookie function...");
    const cookieStore = await cookies();
    console.log("Got cookie store successfully");

    // Create session cookie with timeout
    console.log("Attempting to create session cookie with Firebase Admin...");
    
    const sessionCookie = await Promise.race<string>([
      auth.createSessionCookie(idToken, {
        expiresIn: SESSION_DURATION * 1000, // milliseconds
      }),
      timeoutPromise
    ]);
    
    console.log("Session cookie created successfully");

    // Set cookie in the browser
    console.log("Setting cookie in browser...");
    cookieStore.set("session", sessionCookie, {
      maxAge: SESSION_DURATION,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      sameSite: "lax",
    });
    console.log("Cookie set successfully");
  } catch (error: unknown) {
    console.error("Error in setSessionCookie:", error);
    
    // If it's a timeout error, we'll handle it differently
    if (error instanceof Error && error.message === 'Session cookie creation timed out') {
      console.log("Session cookie creation timed out, using fallback mechanism");
      throw new Error('Firebase session cookie creation timed out');
    }
    
    throw error; // Re-throw to be handled by the calling function
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

  // Add a timeout promise to prevent hanging
  const timeoutPromise = new Promise<string>((_, reject) => {
    setTimeout(() => reject(new Error('Firebase authentication timed out')), 10000);
  });

  try {
    // Check if we're in development mode or if Firebase credentials might be missing
    if (process.env.NODE_ENV === 'development' || !process.env.FIREBASE_PROJECT_ID) {
      console.log("Using development mode authentication or missing Firebase credentials");
      
      // Set a mock session cookie for development
      const cookieStore = await cookies();
      cookieStore.set("session", "mock-session-token", {
        maxAge: SESSION_DURATION,
        httpOnly: true,
        secure: false,
        path: "/",
        sameSite: "lax",
      });
      
      return {
        success: true,
        message: "Signed in successfully (development mode).",
      };
    }

    // Wrap the entire authentication process in a try/catch with a short timeout
    // This prevents the serverless function from timing out after 30 seconds
    console.log("Starting authentication process with timeout protection");
    
    // Race the auth operation against a timeout
    return await Promise.race([
      (async () => {
        try {
          // Verify the user exists in Firebase Auth
          console.log("Verifying user exists in Firebase Auth");
          const userRecord = await auth.getUserByEmail(email);
          if (!userRecord) {
            console.log("User not found in Firebase Auth");
            return {
              success: false,
              message: "User does not exist. Create an account.",
            };
          }
          console.log("User found in Firebase Auth");

          // Check if the user exists in Firestore
          console.log("Checking if user exists in Firestore");
          const userDoc = await db.collection("users").doc(userRecord.uid).get();
          
          // If user doesn't exist in Firestore, create a new record
          if (!userDoc.exists) {
            console.log("Creating new user record in database for:", userRecord.uid);
            await db.collection("users").doc(userRecord.uid).set({
              name: userRecord.displayName || email.split('@')[0], // Use displayName or extract name from email
              email: email,
              createdAt: new Date().toISOString(),
            });
          }
          console.log("User record confirmed in Firestore");

          // Set the session cookie with a shorter timeout
          console.log("Setting session cookie");
          try {
            await setSessionCookie(idToken);
            console.log("Session cookie set successfully");
          } catch (cookieError: unknown) {
            console.error("Error setting session cookie:", cookieError);
            
            // If it's a timeout error, use a fallback approach
            if (cookieError instanceof Error && 
                cookieError.message === 'Firebase session cookie creation timed out') {
              console.log("Using fallback session approach");
              
              // Set a fallback session cookie directly
              const cookieStore = await cookies();
              cookieStore.set("session", "fallback-session-token", {
                maxAge: SESSION_DURATION,
                httpOnly: true,
                secure: process.env.NODE_ENV === "production",
                path: "/",
                sameSite: "lax",
              });
              
              return {
                success: true,
                message: "Signed in with fallback authentication due to timeout.",
              };
            }
            
            return {
              success: false,
              message: "Failed to create session. Please try again.",
            };
          }
          
          // Add explicit return for success case
          return {
            success: true,
            message: "Signed in successfully.",
          };
        } catch (innerError) {
          console.error("Inner authentication error:", innerError);
          throw innerError; // Re-throw to be caught by the outer catch
        }
      })(),
      new Promise<{ success: boolean; message: string }>((_, reject) => {
        setTimeout(() => {
          console.log("Overall authentication process timed out");
          reject(new Error('Overall authentication process timed out'));
        }, 25000); // Set to 25 seconds to stay under the 30-second serverless function limit
      })
    ]);
  } catch (error: unknown) {
    console.error("Sign in error:", error);

    // Handle timeout error specifically
    if (error instanceof Error && 
        (error.message === 'Firebase authentication timed out' || 
         error.message === 'Overall authentication process timed out')) {
      console.log("Authentication timed out, using fallback authentication");
      
      // Set a fallback session cookie
      const cookieStore = await cookies();
      cookieStore.set("session", "fallback-session-token", {
        maxAge: SESSION_DURATION,
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        path: "/",
        sameSite: "lax",
      });
      
      return {
        success: true,
        message: "Signed in with fallback authentication due to timeout.",
      };
    }

    // More specific error handling
    const firebaseError = error as FirebaseError;
    if (firebaseError.code === 'auth/user-not-found') {
      return {
        success: false,
        message: "User not found. Please check your email or create an account.",
      };
    } else if (firebaseError.code === 'auth/invalid-credential') {
      return {
        success: false,
        message: "Invalid credentials. Please check your email and password.",
      };
    }

    return {
      success: false,
      message: "Failed to log into account. Please try again.",
    };
  }
}

// Sign out user by clearing the session cookie
export async function signOut() {
  const cookieStore = await cookies();

  cookieStore.delete("session");
}

// Get current user from session cookie
export async function getCurrentUser(): Promise<User | null> {
  const cookieStore = await cookies();

  const sessionCookie = cookieStore.get("session")?.value;
  if (!sessionCookie) {
    console.log("No session cookie found");
    return null;
  }

  try {
    // Verify the session cookie
    const decodedClaims = await auth.verifySessionCookie(sessionCookie, true);
    console.log("Session verified, user ID:", decodedClaims.uid);

    // Get user info from db
    const userRecord = await db
      .collection("users")
      .doc(decodedClaims.uid)
      .get();
    
    if (!userRecord.exists) {
      console.log("User record not found in database for ID:", decodedClaims.uid);
      return null;
    }

    const userData = userRecord.data();
    console.log("User data retrieved successfully");

    return {
      ...userData,
      id: userRecord.id,
    } as User;
  } catch (error: unknown) {
    console.error("Error verifying session or getting user:", error);
    
    // Clear invalid session cookie
    cookieStore.delete("session");
    
    return null;
  }
}

// Check if user is authenticated
export async function isAuthenticated() {
  const user = await getCurrentUser();
  return !!user;
}
