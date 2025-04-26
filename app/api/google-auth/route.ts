// app/api/google-auth/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/firebass/admin";
import { setSessionCookie } from "@/lib/actions/auth.action";

export async function POST(req: NextRequest) {
  try {
    const { uid, name, email, idToken, photoURL } = await req.json();

    // Check if user exists in Firestore
    const userRef = db.collection("users").doc(uid);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      // Generate avatar URL based on user's name or use Google profile photo if available
      const avatarUrl = photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random&size=200&bold=true&format=svg`;

      // Save to Firestore if new user
      await userRef.set({
        name,
        email,
        avatar: avatarUrl
      });
    }

    // Set session cookie
    await setSessionCookie(idToken);

    return NextResponse.json({ success: true, message: "User signed in successfully." });
  } catch (error) {
    console.error("Google Auth error:", error);
    return NextResponse.json({ success: false, message: "Something went wrong." }, { status: 500 });
  }
}
