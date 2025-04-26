/**
 * Global error handler for the application
 * 
 * This file sets up global error handlers to catch and handle specific errors,
 * particularly the "Meeting ended due to ejection" error from Vapi.
 */

// Store a reference to the original console.error
const originalConsoleError = console.error;

// Function to handle ejection errors
let onEjectionErrorHandler: ((error: Error) => void) | null = null;

/**
 * Set the handler for ejection errors
 * @param handler Function to call when an ejection error occurs
 */
export function setGlobalEjectionErrorHandler(handler: (error: Error) => void): void {
  onEjectionErrorHandler = handler;
  console.log('Global ejection error handler set');
}

/**
 * Initialize global error handlers
 * This should be called as early as possible in the application lifecycle
 */
export function initGlobalErrorHandlers(): void {
  if (typeof window === 'undefined') {
    return; // Only run in browser
  }

  console.log('Initializing global error handlers');

  // Override console.error to catch specific errors
  console.error = function(...args: any[]) {
    // Call the original console.error
    originalConsoleError.apply(console, args);

    // Check if this is an ejection error
    if (args.length > 0) {
      const errorMessage = String(args[0]).toLowerCase();
      
      if (
        errorMessage.includes('meeting ended due to ejection') || 
        errorMessage.includes('meeting has ended')
      ) {
        console.log('Caught ejection error in console.error:', args[0]);
        
        if (onEjectionErrorHandler) {
          onEjectionErrorHandler(new Error(String(args[0])));
        }
      }
    }
  };

  // Add global unhandled error handler
  window.addEventListener('error', (event) => {
    const errorMessage = event.message.toLowerCase();
    
    if (
      errorMessage.includes('meeting ended due to ejection') || 
      errorMessage.includes('meeting has ended')
    ) {
      console.log('Caught ejection error in window.onerror:', event.message);
      
      // Prevent the default error handling
      event.preventDefault();
      
      if (onEjectionErrorHandler) {
        onEjectionErrorHandler(new Error(event.message));
      }
      
      return true; // Prevents the error from propagating
    }
    
    return false; // Let other errors propagate normally
  });
  
  // Add global unhandled promise rejection handler
  window.addEventListener('unhandledrejection', (event) => {
    const errorMessage = event.reason?.message?.toLowerCase() || '';
    
    if (
      errorMessage.includes('meeting ended due to ejection') || 
      errorMessage.includes('meeting has ended')
    ) {
      console.log('Caught ejection error in unhandledrejection:', errorMessage);
      
      // Prevent the default error handling
      event.preventDefault();
      
      if (onEjectionErrorHandler) {
        onEjectionErrorHandler(event.reason);
      }
      
      return true; // Prevents the error from propagating
    }
    
    return false; // Let other errors propagate normally
  });

  // Patch the Error constructor to catch ejection errors at creation time
  const OriginalError = window.Error;
  window.Error = function(message?: string) {
    const error = new OriginalError(message);
    
    if (message && 
        (message.toLowerCase().includes('meeting ended due to ejection') || 
         message.toLowerCase().includes('meeting has ended'))) {
      console.log('Caught ejection error at Error creation:', message);
      
      if (onEjectionErrorHandler) {
        setTimeout(() => {
          onEjectionErrorHandler!(error);
        }, 0);
      }
    }
    
    return error;
  } as any;
  
  // Copy prototype and properties
  window.Error.prototype = OriginalError.prototype;
  Object.setPrototypeOf(window.Error, OriginalError);

  console.log('Global error handlers initialized');
}
