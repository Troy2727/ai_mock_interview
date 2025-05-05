# Vercel Environment Variables Setup

When deploying to Vercel, you need to properly format your environment variables. This document provides the correct format for your Firebase configuration.

## Firebase Web SDK Configuration

Add these environment variables to your Vercel project:

```
NEXT_PUBLIC_FIREBASE_API_KEY="AIzaSyCjra5dwOtJAYLjlJBlTXNE2uWjxNC1kDk"
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="prewise-6f44b.firebaseapp.com"
NEXT_PUBLIC_FIREBASE_PROJECT_ID="prewise-6f44b"
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="prewise-6f44b.firebasestorage.app"
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="424923985679"
NEXT_PUBLIC_FIREBASE_APP_ID="1:424923985679:web:67e047a76cbda4f2a9b07a"
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID="G-LF4L1E9D22"
```

## Important Notes for Vercel Environment Variables

1. Each value must be enclosed in quotes
2. Do not include commas between key-value pairs
3. Make sure to add these variables to all environments (Production, Preview, Development)
4. For the `NEXT_PUBLIC_BASE_URL` variable, use your Vercel deployment URL:
   ```
   NEXT_PUBLIC_BASE_URL="https://ai-mock-interview-ten-snowy.vercel.app"
   ```

## Firebase Authentication Domain Setup

Make sure to add your Vercel domain to the authorized domains in your Firebase project:

1. Go to the [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Go to Authentication > Settings > Authorized domains
4. Add your Vercel domain: `ai-mock-interview-ten-snowy.vercel.app`

## Checking Your Configuration

After deployment, you can visit the `/auth-debug` page on your Vercel deployment to verify that your Firebase configuration is working correctly.
