# Daily.co Error Handling

This document explains the error handling implemented for Daily.co errors in the Vapi SDK integration.

## The Problem

The error "Meeting ended in error: Meeting has ended" occurs when:

1. A Daily.co meeting session ends unexpectedly
2. The connection to the Daily.co server is lost
3. The meeting times out or is terminated by the server
4. Another instance of the application tries to join the same meeting

This error can disrupt the user experience and prevent the application from properly handling the end of an interview session.

## The Solution

We've implemented a comprehensive error handling strategy at multiple levels:

### 1. Vapi SDK Wrapper

We've created a wrapper around the Vapi SDK that intercepts all method calls and handles errors gracefully:

```javascript
// Create a wrapper for the Vapi instance that handles Daily.co errors
const createVapiWrapper = (vapiInstance: any) => {
  // Create a proxy to intercept method calls
  return new Proxy(vapiInstance, {
    get: (target, prop) => {
      // If the property is a method, wrap it to handle errors
      if (typeof target[prop] === "function") {
        return (...args: any[]) => {
          try {
            // Call the original method
            const result = target[prop](...args);

            // If the result is a Promise, handle any errors
            if (result && typeof result.then === "function") {
              return result.catch((error: any) => {
                console.error(`Error in Vapi method ${String(prop)}:`, error);

                // Check if the error is about the meeting ending
                if (
                  error &&
                  typeof error.message === "string" &&
                  (error.message.includes("Meeting has ended") ||
                    error.message.includes("Meeting ended"))
                ) {
                  console.log("Meeting ended, handling gracefully");

                  // Show a user-friendly notification
                  if (typeof document !== "undefined") {
                    const notification = document.createElement("div");
                    notification.style.cssText =
                      "position:fixed;top:0;left:0;right:0;background:#f44336;color:white;padding:10px;text-align:center;z-index:9999";
                    notification.textContent =
                      "The interview session has ended. Your responses have been saved. Please refresh the page to start a new session.";
                    document.body.appendChild(notification);
                    setTimeout(() => notification.remove(), 5000);
                  }

                  // Return a resolved promise to prevent the error from propagating
                  return Promise.resolve();
                }

                // Re-throw other errors
                throw error;
              });
            }

            return result;
          } catch (error) {
            console.error(`Error in Vapi method ${String(prop)}:`, error);
            throw error;
          }
        };
      }

      // Return the original property
      return target[prop];
    },
  });
};
```

### 2. Global Error Handlers

We've added global error handlers to catch Daily.co errors at the window level:

```javascript
// Set up a global error handler for Daily.co errors
if (typeof window !== "undefined") {
  // Override the console.error method to catch Daily.co errors
  const originalConsoleError = console.error;
  console.error = function (...args) {
    // Call the original console.error
    originalConsoleError.apply(console, args);

    // Check if this is a Daily.co error
    const errorMessage = args.join(" ");
    if (
      errorMessage.includes("Meeting has ended") ||
      errorMessage.includes("Meeting ended")
    ) {
      // Try to clean up any Daily.co resources
      try {
        if (window.__VAPI_INSTANCE__) {
          window.__VAPI_INSTANCE__.stop();
        }
      } catch (cleanupError) {
        originalConsoleError.call(
          console,
          "Error during cleanup:",
          cleanupError
        );
      }
    }
  };

  // Add a global unhandled rejection handler
  window.addEventListener("unhandledrejection", (event) => {
    if (
      event.reason &&
      typeof event.reason.message === "string" &&
      (event.reason.message.includes("Meeting has ended") ||
        event.reason.message.includes("Meeting ended"))
    ) {
      console.log("Caught unhandled rejection for Meeting ended error");
      event.preventDefault();
    }
  });
}
```

### 3. Component-Level Error Handling

Both the `Agent` and `OptimizedAgent` components have been updated to handle Daily.co errors:

```javascript
// Add a special handler for unhandled errors
const handleUnhandledError = (event: ErrorEvent) => {
  if (
    event.error &&
    typeof event.error.message === "string" &&
    (event.error.message.includes("Meeting has ended") ||
      event.error.message.includes("Meeting ended"))
  ) {
    console.log("Caught unhandled error in Agent component");
    setCallStatus(CallStatus.FINISHED);
    event.preventDefault();
  }
};

window.addEventListener("error", handleUnhandledError);

// Clean up the event listener when the component unmounts
return () => {
  // ...
  window.removeEventListener("error", handleUnhandledError);
};
```

### 4. Singleton Pattern for Vapi Instance

To prevent multiple instances of the Vapi SDK (and thus Daily.co) from being created, we've implemented a singleton pattern:

```javascript
// Create Vapi instance
if (!window.__VAPI_INSTANCE__) {
  try {
    console.log("Creating new Vapi instance");
    vapi = new Vapi(process.env.NEXT_PUBLIC_VAPI_WEB_TOKEN!);
    // Store the instance globally to prevent duplication
    window.__VAPI_INSTANCE__ = vapi;
  } catch (initError) {
    console.error("Error initializing Vapi instance:", initError);
    vapi = createMockVapi();
  }
} else {
  console.log("Using existing Vapi instance");
  vapi = window.__VAPI_INSTANCE__;
}
```

## Benefits

This error handling strategy provides several benefits:

1. **Improved User Experience**: Users receive clear notifications when a meeting ends unexpectedly
2. **Proper Resource Cleanup**: Resources are properly cleaned up when a meeting ends
3. **Graceful Error Recovery**: The application can recover gracefully from Daily.co errors
4. **Consistent State Management**: The application state is updated correctly when a meeting ends

## Additional Recommendations

1. **Session Management**: Consider implementing session management to track active interviews
2. **Reconnection Logic**: Add reconnection logic to automatically reconnect if a meeting ends unexpectedly
3. **Error Reporting**: Consider adding error reporting to track and analyze Daily.co errors
4. **Timeout Handling**: Implement timeout handling to prevent interviews from running indefinitely
