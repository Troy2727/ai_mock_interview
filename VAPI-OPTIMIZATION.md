# Optimizing Vapi Performance

This document explains the optimizations made to improve the performance of the Vapi integration, particularly to reduce the time it takes to ask questions during interviews.

## Optimizations Made

1. **Optimized Vapi SDK Initialization**

   - Added timeout handling to prevent hanging on API calls
   - Improved error handling and fallback mechanisms
   - Reduced debug output in production environments
   - Added configuration options for fine-tuning performance

2. **Optimized Interviewer Configuration**

   - Adjusted voice parameters for faster responses
   - Simplified the system prompt to reduce token count
   - Streamlined the instructions to focus on essential behaviors

3. **Optimized Agent Component**
   - Added timeout handling for API calls
   - Pre-formatted questions to avoid processing during call initialization
   - Separated event handling for better performance
   - Used memoization with useCallback for event handlers
   - Added more robust error handling

## How to Use the Optimized Components

### Option 1: Replace the existing components

Replace the imports in your files:

```typescript
// Use the standard imports for both components
import { vapi } from "@/lib/vapi.sdk";
import { interviewer } from "@/constants";
```

And replace the Agent component:

```typescript
// Before
import Agent from "@/components/Agent";

// After
import Agent from "@/components/OptimizedAgent";
```

### Option 2: Test the optimized components alongside existing ones

You can keep both implementations and test them side by side to compare performance.

## Additional Recommendations

1. **Environment Variables**

   - Set `NEXT_PUBLIC_USE_MOCK=false` in your `.env.local` file to ensure consistent behavior between development and production

2. **Development Server**

   - Use the standard development server without Turbopack if experiencing issues on Windows:
     ```
     npm run dev
     ```
   - For testing with Turbopack:
     ```
     npm run dev:turbo
     ```

3. **Browser Compatibility**

   - Ensure you're using a modern browser that fully supports the MediaDevices API
   - Chrome, Edge, and Safari provide the best compatibility

4. **Network Conditions**

   - The optimizations include better handling of slow network conditions
   - Added timeouts prevent the UI from hanging during API calls

5. **KrispSDK Duplication Fix**
   - The Vapi SDK has been modified to use a singleton pattern to prevent KrispSDK duplication
   - This ensures that only one instance of the Vapi SDK (and thus KrispSDK) is created
   - The fix uses a global window.**VAPI_INSTANCE** variable to store the Vapi instance
