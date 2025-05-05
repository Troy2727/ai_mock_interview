# Setting Up Vapi with Vercel Domain

This guide explains how to configure your Vapi workflow to work with your Vercel domain and handle redirects properly.

## Prerequisites

1. A Vapi account with API access
2. A Vercel deployment of your application
3. Your Vercel domain added to Vapi as an authorized domain

## Step 1: Add Your Vercel Domain to Vapi

1. Log in to your Vapi dashboard
2. Go to Settings > Domains
3. Add your Vercel domain: `https://ai-mock-interview-ten-snowy.vercel.app`
4. Save your changes

## Step 2: Configure Environment Variables in Vercel

Make sure your Vercel project has these environment variables set:

```
# Vapi AI Configuration
NEXT_PUBLIC_VAPI_WEB_TOKEN="your-vapi-web-token"
NEXT_PUBLIC_VAPI_WORKFLOW_ID="your-workflow-id"
NEXT_PUBLIC_FORCE_MOCK_VAPI="false"

# Application URL
NEXT_PUBLIC_BASE_URL="https://ai-mock-interview-ten-snowy.vercel.app"
```

To set these in Vercel:
1. Go to your project in the Vercel dashboard
2. Navigate to Settings > Environment Variables
3. Add the variables above with their values
4. Redeploy your application

## Step 3: Configure Permissions Policy in next.config.js

Make sure your `next.config.js` file has the correct permissions policy for microphone access:

```javascript
// Add security headers to fix Cross-Origin-Opener-Policy issues
async headers() {
  return [
    {
      source: '/(.*)',
      headers: [
        {
          key: 'Cross-Origin-Opener-Policy',
          value: 'unsafe-none',
        },
        {
          key: 'Cross-Origin-Embedder-Policy',
          value: 'unsafe-none',
        },
        {
          key: 'Cross-Origin-Resource-Policy',
          value: 'cross-origin',
        },
        // Additional security headers
        {
          key: 'X-Content-Type-Options',
          value: 'nosniff',
        },
        {
          key: 'X-Frame-Options',
          value: 'SAMEORIGIN',
        },
        {
          key: 'X-XSS-Protection',
          value: '1; mode=block',
        },
        {
          key: 'Referrer-Policy',
          value: 'origin-when-cross-origin',
        },
        {
          key: 'Permissions-Policy',
          value: 'camera=(), microphone=(self), geolocation=()',
        },
      ],
    },
  ];
},
```

## Step 4: Test the Vapi Integration

1. Visit `/vapi-test` on your Vercel deployment
2. Check that your domain is authorized and microphone permissions are granted
3. Click the "Start Interview" button to test the integration
4. The workflow should start and eventually redirect back to your Vercel domain
5. The `VapiRedirectHandler` component will process the redirect and take you to the dashboard

## Troubleshooting

### Microphone Permission Issues

If you see this error: `[Violation] Permissions policy violation: microphone is not allowed in this document.`

1. Make sure your `next.config.js` has the correct Permissions-Policy header
2. Ensure you've granted microphone permissions in your browser
3. Try using the `MicrophonePermissionHandler` component to explicitly request permissions

### Domain Authorization Issues

If you see errors about unauthorized domains:

1. Make sure your Vercel domain is added to Vapi's authorized domains
2. Check that you're using the correct Vapi web token
3. Verify that the domain in your browser matches exactly what you added to Vapi

### Cross-Origin Issues

If you see Cross-Origin-Opener-Policy errors:

1. Make sure your `next.config.js` has the correct headers
2. Try clearing your browser cache and cookies
3. Check for any browser extensions that might be interfering

## Using the VapiWorkflowButton Component

The `VapiWorkflowButton` component makes it easy to start Vapi workflows:

```jsx
import VapiWorkflowButton from '@/components/VapiWorkflowButton';

export default function MyPage() {
  return (
    <div>
      <h1>Start an Interview</h1>
      <VapiWorkflowButton 
        buttonText="Start Interview"
        redirectPath="/dashboard"
        variableValues={{
          username: 'User Name',
          role: 'Software Engineer'
        }}
      />
    </div>
  );
}
```

## Need Help?

If you're still having issues, check the Vapi documentation or contact Vapi support for assistance.
