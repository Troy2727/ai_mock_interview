import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

export async function GET(req: NextRequest) {
  try {
    // Get the origin from the request
    const origin = req.headers.get('origin') || 'http://localhost:3000';

    // Since we don't have the Vapi organization ID and private key yet,
    // let's use the public web token directly for now
    const webToken = process.env.NEXT_PUBLIC_VAPI_WEB_TOKEN;

    if (!webToken) {
      return NextResponse.json(
        {
          error: 'Missing environment variables',
          message: 'Please set NEXT_PUBLIC_VAPI_WEB_TOKEN in your .env.local file'
        },
        { status: 500 }
      );
    }

    // For now, we'll just return the web token directly
    // This is a temporary solution until we get the proper Vapi organization ID and private key
    return NextResponse.json({ token: webToken });

    // The code below is the proper implementation using JWT, but we'll keep it commented out
    // until we have the proper Vapi organization ID and private key
    /*
    // Get the Vapi organization ID and private key from environment variables
    const orgId = process.env.NEXT_PUBLIC_VAPI_ORG_ID;
    const privateKey = process.env.VAPI_PRIVATE_KEY;

    // Check if the required environment variables are set
    if (!orgId || !privateKey) {
      return NextResponse.json(
        {
          error: 'Missing environment variables',
          message: 'Please set NEXT_PUBLIC_VAPI_ORG_ID and VAPI_PRIVATE_KEY in your .env.local file'
        },
        { status: 500 }
      );
    }

    // Create the payload for the JWT token
    const payload = {
      orgId: orgId,
      token: {
        tag: "public",
        restrictions: {
          enabled: true,
          allowedOrigins: [origin, "http://localhost:3000", "https://localhost:3000"],
          allowTransientAssistant: true,
        },
      },
    };

    // Define token options
    const options = {
      expiresIn: "24h", // Token expires in 24 hours
    };

    // Generate the JWT token
    const token = jwt.sign(payload, privateKey, options);

    // Return the token
    return NextResponse.json({ token });
    */
  } catch (error) {
    console.error('Error generating Vapi token:', error);
    return NextResponse.json(
      { error: 'Failed to generate token', message: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
