/**
 * Vapi instance management
 */
// Import the real Vapi SDK
import Vapi from '@vapi-ai/web';

// Import our mock implementation (for fallback)
import { MockVapi } from './mock';

import { connectionState, setupConnectionMonitoring, startKeepAlive, stopKeepAlive } from './connection';
import { handleConnectionLost, handleEjectionError } from './error-handling';

// Create a singleton instance of Vapi to prevent multiple initializations
let vapiInstance: any = null;

// Use the real Vapi implementation
// const Vapi = MockVapi;

// Expose the Vapi instance globally for error handling
if (typeof window !== 'undefined') {
  (window as any).__VAPI_INSTANCE__ = vapiInstance;
}

/**
 * Reset the Vapi instance and ejection state
 */
export function resetInstance(): void {
  vapiInstance = null;
  if (typeof window !== 'undefined') {
    (window as any).__VAPI_INSTANCE__ = null;

    // Reset the ejection state
    import('./ejection-state').then(({ resetEjectionState }) => {
      resetEjectionState();
    });
  }
}

/**
 * Get or initialize the Vapi instance with enhanced connection monitoring
 * @param options Optional configuration options
 * @returns Vapi instance
 */
export function getVapiInstance(options?: {
  audioDeviceId?: string;
  onError?: (error: Error) => void;
  onConnectionLost?: (error?: Error) => void;
  onReconnectSuccess?: () => void;
  onReconnectFailed?: (error?: Error) => void;
  onEjection?: (error?: Error) => void;
}): any {
  if (!vapiInstance) {
    console.log('Creating new Vapi instance...');

    // Check if we're in a browser environment
    if (typeof window === 'undefined') {
      console.warn('Not in browser environment, using mock implementation');
      vapiInstance = new MockVapi('mock-token');
    }
    // Check if we have the Vapi token
    else if (!process.env.NEXT_PUBLIC_VAPI_WEB_TOKEN) {
      console.warn('No VAPI_WEB_TOKEN found, using mock implementation');
      vapiInstance = new MockVapi('mock-token');
    }
    // Try to create a real Vapi instance
    else {
      try {
        console.log('Creating real Vapi instance with token:',
          process.env.NEXT_PUBLIC_VAPI_WEB_TOKEN.substring(0, 5) + '...');

        // Create the real Vapi instance with proper error handling
        vapiInstance = new Vapi(process.env.NEXT_PUBLIC_VAPI_WEB_TOKEN);
        console.log('Real Vapi instance created successfully');

        // Set up all event handlers according to documentation
        if (typeof vapiInstance.on === 'function') {
          // Error handler
          vapiInstance.on('error', (error: any) => {
            console.error('Vapi instance error event:', error);
            if (options?.onError) {
              options.onError(error instanceof Error ? error : new Error(String(error)));
            }
          });

          // Call status handlers
          vapiInstance.on('call-start', () => {
            console.log('Call has started');
            connectionState.isConnected = true;
            connectionState.lastPingTime = Date.now();
          });

          vapiInstance.on('call-end', () => {
            console.log('Call has ended');
            connectionState.isConnected = false;
          });

          // Speech handlers
          vapiInstance.on('speech-start', () => {
            console.log('Assistant speech has started');
          });

          vapiInstance.on('speech-end', () => {
            console.log('Assistant speech has ended');
          });
        }
      } catch (error) {
        console.error('Error creating Vapi instance, falling back to mock:', error);
        // Fallback to mock if real Vapi fails
        vapiInstance = new MockVapi(process.env.NEXT_PUBLIC_VAPI_WEB_TOKEN);
      }
    }

    // Update global reference
    if (typeof window !== 'undefined') {
      (window as any).__VAPI_INSTANCE__ = vapiInstance;
    }

    // Store connection event handlers
    if (options?.onConnectionLost) connectionState.onConnectionLost = options.onConnectionLost;
    if (options?.onReconnectSuccess) connectionState.onReconnectSuccess = options.onReconnectSuccess;
    if (options?.onReconnectFailed) connectionState.onReconnectFailed = options.onReconnectFailed;
    if (options?.onEjection) connectionState.onEjection = options.onEjection;

    // Set up connection monitoring
    setupConnectionMonitoring();
  }

  return vapiInstance;
}

/**
 * Reset the Vapi instance (useful when switching between different components)
 */
export function resetVapiInstance(): void {
  if (vapiInstance) {
    try {
      // Stop keep-alive and monitoring
      stopKeepAlive();

      // Stop the call
      vapiInstance.stop();
    } catch (error) {
      console.warn('Error stopping Vapi instance:', error);
    }

    // Reset state
    connectionState.isConnected = false;
    connectionState.lastPingTime = 0;
    connectionState.reconnectAttempts = 0;
    connectionState.currentCallConfig = null;

    // Reset instance
    resetInstance();
  }
}
