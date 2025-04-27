/**
 * Vapi instance management
 */
// Import the real Vapi SDK (commented out for now)
// import Vapi from '@vapi-ai/web';

// Import our mock implementation
import { MockVapi } from './mock';

import { connectionState, setupConnectionMonitoring, startKeepAlive, stopKeepAlive } from './connection';
import { handleConnectionLost, handleEjectionError } from './error-handling';

// Create a singleton instance of Vapi to prevent multiple initializations
let vapiInstance: any = null;

// Use the mock implementation instead of the real one
const Vapi = MockVapi;

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
    // Create a mock Vapi instance
    vapiInstance = {
      // Basic methods
      start: async () => {
        console.log('Mock Vapi: Starting call...');
        // Simulate a successful call start after a short delay
        setTimeout(() => {
          if (typeof vapiInstance._eventHandlers['call-start'] === 'function') {
            vapiInstance._eventHandlers['call-start']();
          }
        }, 1000);
        return { id: 'mock-call-id' };
      },
      stop: async () => {
        console.log('Mock Vapi: Stopping call...');
        // Simulate a call end
        setTimeout(() => {
          if (typeof vapiInstance._eventHandlers['call-end'] === 'function') {
            vapiInstance._eventHandlers['call-end']();
          }
        }, 500);
      },
      send: (message: any) => {
        console.log('Mock Vapi: Sending message:', message);
      },
      say: (text: string) => {
        console.log('Mock Vapi: Saying:', text);
      },
      isMuted: () => false,
      setMuted: (muted: boolean) => {
        console.log('Mock Vapi: Setting muted:', muted);
      },

      // Event handling
      _eventHandlers: {} as Record<string, Function>,
      on: function(event: string, handler: Function) {
        console.log('Mock Vapi: Adding event listener for', event);
        this._eventHandlers[event] = handler;
      },
      off: function(event: string, handler: Function) {
        console.log('Mock Vapi: Removing event listener for', event);
        if (this._eventHandlers[event] === handler) {
          delete this._eventHandlers[event];
        }
      },
      removeAllListeners: function() {
        console.log('Mock Vapi: Removing all listeners');
        this._eventHandlers = {};
      }
    };

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
