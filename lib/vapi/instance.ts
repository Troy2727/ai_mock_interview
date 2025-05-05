/**
 * Vapi instance management
 */
// Import the real Vapi SDK (for type checking)
import OriginalVapi from '@vapi-ai/web';

// Import our custom Vapi implementation that fixes URL construction issues
import CustomVapi from './custom-vapi';

// Import our mock implementation (for fallback)
import { MockVapi } from './mock';

// Configuration flag to force using the mock implementation
// Set this to true to always use the mock implementation, even in production
const FORCE_MOCK_VAPI = process.env.NEXT_PUBLIC_FORCE_MOCK_VAPI === 'true' || false;

// Configuration flag to force using the real implementation
// Set this to true to always use the real implementation, even in development
const FORCE_REAL_VAPI = !FORCE_MOCK_VAPI && (process.env.NEXT_PUBLIC_FORCE_REAL_VAPI === 'true' || false);

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
  token?: string; // JWT token for authentication
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
    // Check if we should force using the mock implementation
    else if (FORCE_MOCK_VAPI) {
      console.log('FORCE_MOCK_VAPI is enabled, using mock implementation');
      vapiInstance = new MockVapi(process.env.NEXT_PUBLIC_VAPI_WEB_TOKEN);
    }
    // Check if a JWT token is provided in the options
    else if (options?.token) {
      console.log('Using provided JWT token for Vapi instance');

      try {
        console.log('Creating real Vapi instance with provided JWT token');

        // Log the current domain for debugging
        console.log('Current domain:', window.location.hostname);

        // Create options for Vapi initialization
        const vapiOptions = {
          debug: true // Enable debug mode for better logging
        };

        // Create our custom Vapi instance with the provided JWT token
        vapiInstance = new CustomVapi(options.token, vapiOptions);
      } catch (error) {
        console.error('Error creating real Vapi instance with JWT token, falling back to mock:', error);
        vapiInstance = new MockVapi(options.token);
      }
    }
    // Check if we should force using the real implementation
    else if (FORCE_REAL_VAPI) {
      console.log('FORCE_REAL_VAPI is enabled, using real implementation');

      try {
        console.log('Creating real Vapi instance with token:',
          process.env.NEXT_PUBLIC_VAPI_WEB_TOKEN.substring(0, 5) + '...');

        // Log the current domain for debugging
        console.log('Current domain:', window.location.hostname);

        // Create options for Vapi initialization
        const vapiOptions = {
          debug: true // Enable debug mode for better logging
        };

        // Create our custom Vapi instance with proper error handling
        vapiInstance = new CustomVapi(process.env.NEXT_PUBLIC_VAPI_WEB_TOKEN, vapiOptions);
      } catch (error) {
        console.error('Error creating real Vapi instance, falling back to mock:', error);
        vapiInstance = new MockVapi(process.env.NEXT_PUBLIC_VAPI_WEB_TOKEN);
      }
    }
    // Check if we're in development mode
    else if (
      window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1'
    ) {
      // In development, always use the mock implementation to avoid API issues
      console.log('Development environment detected, using mock implementation');
      console.log('This prevents issues with the Vapi API during local development');

      // Create a mock instance with the real token for testing
      vapiInstance = new MockVapi(process.env.NEXT_PUBLIC_VAPI_WEB_TOKEN);
    }
    // For production, use the real Vapi instance
    else {
      try {
        console.log('Production environment detected, creating real Vapi instance');
        console.log('Creating real Vapi instance with token:',
          process.env.NEXT_PUBLIC_VAPI_WEB_TOKEN.substring(0, 5) + '...');

        // Log the current domain for debugging
        console.log('Current domain:', window.location.hostname);

        // Create options for Vapi initialization
        const vapiOptions = {
          debug: true // Enable debug mode for better logging
        };

        // Create our custom Vapi instance with proper error handling
        // This uses our wrapper that fixes URL construction issues
        vapiInstance = new CustomVapi(process.env.NEXT_PUBLIC_VAPI_WEB_TOKEN, vapiOptions);
        console.log('Real Vapi instance created successfully');

        // Set up all event handlers according to documentation
        if (typeof vapiInstance.on === 'function') {
          // Error handler with improved logging
          vapiInstance.on('error', (error: any) => {
            console.error('Vapi instance error event:', error);

            // Skip empty errors during initialization
            if (!error || error === {} || String(error) === '{}' || String(error) === '[object Object]') {
              console.log('Ignoring empty error during Vapi initialization');
              return;
            }

            // Log detailed error information
            console.log('Error details:', {
              message: error?.message || 'Unknown error',
              name: error?.name,
              code: error?.code,
              stack: error?.stack,
              toString: String(error)
            });

            // Check for specific error types
            if (error?.message?.includes('unauthorized') ||
                error?.message?.includes('domain') ||
                error?.code === 'unauthorized-domain') {
              console.error('Domain authorization error detected. Please add this domain to your Vapi authorized domains list.');

              // Show a more helpful error message in the console
              console.info(`
                =====================================================
                VAPI DOMAIN AUTHORIZATION ERROR
                =====================================================
                Please add the following domain to your Vapi dashboard:
                ${window.location.hostname}

                If you're using Vapi with Firebase, also make sure to add
                this domain to your Firebase authorized domains list.
                =====================================================
              `);

              // Call onError with a more specific error
              if (options?.onError) {
                options.onError(new Error(`Domain authorization error: Please add ${window.location.hostname} to your Vapi authorized domains`));
              }
              return;
            }

            // Handle microphone permission errors
            if (error?.message?.includes('microphone') ||
                error?.message?.includes('audio') ||
                error?.message?.includes('permission')) {
              console.error('Microphone permission error detected');

              // Call onError with a more specific error
              if (options?.onError) {
                options.onError(new Error('Microphone access is required. Please grant microphone permissions and try again.'));
              }
              return;
            }

            // Default error handling
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
