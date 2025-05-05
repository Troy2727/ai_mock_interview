// app/api/google-auth/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/firebass/admin";
import { setSessionCookie } from "@/lib/actions/auth.action";

export async function POST(req: NextRequest) {
  try {
    // Log the request for debugging
    console.log("Google Auth API called");
    console.log("Environment:", process.env.NODE_ENV);
    console.log("Vercel environment:", process.env.VERCEL_ENV);

    // Parse the request body
    let body;
    try {
      body = await req.json();
      console.log("Request body received:", JSON.stringify({
        uid: body.uid,
        name: body.name,
        email: body.email,
        idToken: body.idToken ? "present" : "missing",
        photoURL: body.photoURL ? "present" : "missing"
      }));
    } catch (parseError) {
      console.error("Error parsing request body:", parseError);
      return NextResponse.json({
        success: false,
        message: "Invalid request body"
      }, { status: 400 });
    }

    const { uid, name, email, idToken, photoURL } = body;

    // Validate required fields
    if (!uid || !email || !idToken) {
      console.error("Missing required fields:", { uid: !!uid, email: !!email, idToken: !!idToken });
      return NextResponse.json({
        success: false,
        message: "Missing required fields"
      }, { status: 400 });
    }

    try {
      // Check if user exists in Firestore
      console.log("Checking if user exists in Firestore");
      const userRef = db.collection("users").doc(uid);
      const userDoc = await userRef.get();

      if (!userDoc.exists) {
        console.log("User does not exist, creating new user");
        // Generate avatar URL based on user's name or use Google profile photo if available
        const avatarUrl = photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(name || "User")}&background=random&size=200&bold=true&format=svg`;

        // Save to Firestore if new user
        await userRef.set({
          name: name || "User",
          email,
          avatar: avatarUrl
        });
        console.log("New user created successfully");
      } else {
        console.log("User already exists");
      }
    } catch (dbError) {
      console.error("Error accessing Firestore:", dbError);
      // Continue with authentication even if Firestore operations fail
      // This allows users to sign in even if there are database issues
    }

    try {
      // Set session cookie
      console.log("Setting session cookie");
      await setSessionCookie(idToken);
      console.log("Session cookie set successfully");
    } catch (cookieError) {
      console.error("Error setting session cookie:", cookieError);

      // In development or Vercel preview, we can continue without a valid session cookie
      // This allows testing without proper Firebase Admin setup
      if (process.env.NODE_ENV !== 'production' || process.env.VERCEL_ENV === 'preview') {
        console.log("Development or preview environment detected, continuing with local session");

        // Return success but indicate we're using a local session
        return NextResponse.json({
          success: true,
          message: "User signed in with local session.",
          useLocalSession: true
        });
      } else {
        // In production, log the error but don't throw it
        // Instead, return a more helpful error message
        return NextResponse.json({
          success: false,
          message: "Error setting session cookie",
          error: cookieError instanceof Error ? cookieError.message : "Unknown error"
        }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true, message: "User signed in successfully." });
  } catch (error) {
    console.error("Google Auth error:", error);

    // Provide more detailed error message
    const errorMessage = error instanceof Error
      ? error.message
      : "Unknown error occurred";

    // Log additional context for debugging
    console.error("Error context:", {
      environment: process.env.NODE_ENV,
      vercelEnv: process.env.VERCEL_ENV,
      errorType: error instanceof Error ? error.constructor.name : typeof error
    });

    return NextResponse.json({
      success: false,
      message: "Authentication failed",
      error: errorMessage
    }, { status: 500 });
  }
}
