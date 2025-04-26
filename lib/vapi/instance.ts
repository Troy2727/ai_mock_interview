/**
 * Vapi instance management
 */
import Vapi from '@vapi-ai/web';
import { connectionState, setupConnectionMonitoring, startKeepAlive, stopKeepAlive } from './connection';
import { handleConnectionLost, handleEjectionError } from './error-handling';

// Create a singleton instance of Vapi to prevent multiple initializations
let vapiInstance: Vapi | null = null;

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
}): Vapi {
  if (!vapiInstance) {
    if (!process.env.NEXT_PUBLIC_VAPI_WEB_TOKEN) {
      throw new Error('NEXT_PUBLIC_VAPI_WEB_TOKEN is not defined');
    }

    // Initialize Vapi with the token
    vapiInstance = new Vapi(process.env.NEXT_PUBLIC_VAPI_WEB_TOKEN);

    // Update global reference
    if (typeof window !== 'undefined') {
      (window as any).__VAPI_INSTANCE__ = vapiInstance;
    }

    // Store connection event handlers
    if (options?.onConnectionLost) connectionState.onConnectionLost = options.onConnectionLost;
    if (options?.onReconnectSuccess) connectionState.onReconnectSuccess = options.onReconnectSuccess;
    if (options?.onReconnectFailed) connectionState.onReconnectFailed = options.onReconnectFailed;
    if (options?.onEjection) connectionState.onEjection = options.onEjection;

    // Add global error handler with connection recovery
    vapiInstance.on('error', (error: Error) => {
      console.error('Vapi error:', error);

      // Check if this is a connection-related error
      const errorMessage = error.message.toLowerCase();

      // Check for ejection errors (meeting ended)
      const isEjectionError =
        errorMessage.includes('meeting ended') ||
        errorMessage.includes('ejection') ||
        errorMessage.includes('meeting has ended');

      // Check for other connection errors
      const isConnectionError =
        errorMessage.includes('network') ||
        errorMessage.includes('connection') ||
        errorMessage.includes('timeout') ||
        errorMessage.includes('disconnected');

      if (isEjectionError) {
        // Handle ejection errors differently
        handleEjectionError(error);
      } else if (isConnectionError && connectionState.isConnected) {
        // Handle regular connection errors
        handleConnectionLost(error);
      }

      if (options?.onError) {
        options.onError(error);
      }
    });

    // Set up connection monitoring
    setupConnectionMonitoring();

    // Set up event listeners for connection state
    vapiInstance.on('call-start', () => {
      connectionState.isConnected = true;
      connectionState.lastPingTime = Date.now();
      connectionState.reconnectAttempts = 0;
      connectionState.ejectionReconnectAttempts = 0;
      if (vapiInstance) {
        startKeepAlive(vapiInstance);
      }
    });

    vapiInstance.on('call-end', () => {
      connectionState.isConnected = false;
      stopKeepAlive();
    });
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
