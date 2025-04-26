/**
 * WebSocket patch to handle ejection errors in Vapi
 * 
 * This file patches the global WebSocket object to intercept and handle
 * ejection errors that occur in the Vapi library.
 */

// Store the original WebSocket constructor
const OriginalWebSocket = typeof window !== 'undefined' ? window.WebSocket : null;

// Function to handle ejection errors
let onEjectionErrorHandler: ((error: Error) => void) | null = null;

/**
 * Set the handler for ejection errors
 * @param handler Function to call when an ejection error occurs
 */
export function setEjectionErrorHandler(handler: (error: Error) => void): void {
  onEjectionErrorHandler = handler;
}

// Only patch in browser environment
if (typeof window !== 'undefined' && OriginalWebSocket) {
  try {
    // Create a patched WebSocket class
    class PatchedWebSocket extends OriginalWebSocket {
      constructor(url: string | URL, protocols?: string | string[]) {
        super(url, protocols);
        
        // Add special error handling
        this.addEventListener('error', (event) => {
          console.log('WebSocket error intercepted:', event);
          
          // Check if this is a Vapi WebSocket
          const urlString = url.toString();
          if (urlString.includes('vapi.ai') || urlString.includes('vapi-') || urlString.includes('api.vapi')) {
            console.log('Vapi WebSocket error detected');
            
            // Call the ejection error handler if set
            if (onEjectionErrorHandler) {
              onEjectionErrorHandler(new Error('WebSocket error in Vapi connection'));
            }
          }
        });
        
        // Add special close handling
        this.addEventListener('close', (event) => {
          console.log('WebSocket close intercepted:', event);
          
          // Check if this is a Vapi WebSocket
          const urlString = url.toString();
          if (urlString.includes('vapi.ai') || urlString.includes('vapi-') || urlString.includes('api.vapi')) {
            console.log('Vapi WebSocket close detected with code:', event.code);
            
            // Check for abnormal closure or policy violation (which might indicate ejection)
            if (event.code === 1006 || event.code === 1008) {
              console.warn('Abnormal WebSocket closure detected in Vapi connection');
              
              // Call the ejection error handler if set
              if (onEjectionErrorHandler) {
                onEjectionErrorHandler(new Error('Abnormal WebSocket closure in Vapi connection'));
              }
            }
          }
        });
      }
    }
    
    // Replace the global WebSocket with our patched version
    window.WebSocket = PatchedWebSocket as any;
    console.log('WebSocket successfully patched for Vapi ejection handling');
  } catch (error) {
    console.error('Failed to patch WebSocket:', error);
  }
}

/**
 * Initialize the WebSocket patch
 * This function should be called early in the application lifecycle
 */
export function initWebSocketPatch(): void {
  if (typeof window !== 'undefined') {
    console.log('WebSocket patch initialized');
  }
}
