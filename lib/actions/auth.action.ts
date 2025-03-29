"use server";

import { auth, db } from "@/firebase/admin";
import { cookies } from "next/headers";

// Session duration (1 week)
const SESSION_DURATION = 60 * 60 * 24 * 7;

// Set session cookie
export async function setSessionCookie(idToken: string) {
  const cookieStore = await cookies();

  // Create session cookie
  const sessionCookie = await auth.createSessionCookie(idToken, {
    expiresIn: SESSION_DURATION * 1000, // milliseconds
  });

  // Set cookie in the browser
  cookieStore.set("session", sessionCookie, {
    maxAge: SESSION_DURATION,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    sameSite: "lax",
  });
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
  } catch (error: any) {
    console.error("Error creating user:", error);

    // Handle Firebase specific errors
    if (error.code === "auth/email-already-exists") {
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
    // Verify the user exists in Firebase Auth
    const userRecord = await auth.getUserByEmail(email);
    if (!userRecord)
      return {
        success: false,
        message: "User does not exist. Create an account.",
      };

    // Check if the user exists in Firestore
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

    // Set the session cookie
    try {
      await setSessionCookie(idToken);
    } catch (cookieError) {
      console.error("Error setting session cookie:", cookieError);
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
  } catch (error: any) {
    console.error("Sign in error:", error);

    // More specific error handling
    if (error.code === 'auth/user-not-found') {
      return {
        success: false,
        message: "User not found. Please check your email or create an account.",
      };
    } else if (error.code === 'auth/invalid-credential') {
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
  } catch (error) {
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
