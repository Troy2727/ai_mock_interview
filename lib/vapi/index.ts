/**
 * Main exports for Vapi SDK
 */
import Vapi from '@vapi-ai/web';
import { getVapiInstance, resetVapiInstance } from './instance';
import { saveCallConfig } from './connection';
import { connectionState } from './connection';

// Re-export the main functions
export { getVapiInstance, resetVapiInstance, saveCallConfig };

/**
 * Start a call with Vapi with enhanced connection handling
 * @param workflowIdOrAssistant Workflow ID or assistant configuration
 * @param options Call options
 */
export async function startEnhancedCall(
  workflowIdOrAssistant: string | Record<string, unknown>,
  options?: { variableValues?: Record<string, unknown> }
): Promise<void> {
  console.log('startEnhancedCall called with:', {
    workflowId: typeof workflowIdOrAssistant === 'string' ? workflowIdOrAssistant : 'custom assistant config',
    options
  });

  // Log the exact type and value for debugging
  console.log('workflowIdOrAssistant type:', typeof workflowIdOrAssistant);
  console.log('workflowIdOrAssistant value:',
    typeof workflowIdOrAssistant === 'string'
      ? workflowIdOrAssistant
      : JSON.stringify(workflowIdOrAssistant));

  // Validate input parameters
  if (!workflowIdOrAssistant) {
    console.error('No workflow ID or assistant config provided');
    throw new Error('No workflow ID or assistant config provided');
  }

  // Reset any existing Vapi instance to ensure a clean start
  resetVapiInstance();

  // Get or create a fresh Vapi instance
  const vapiInstance = getVapiInstance({
    onError: (error) => {
      console.error('Vapi error during call:', error);
    },
    onConnectionLost: () => {
      console.warn('Connection lost during call');
    }
  });

  if (!vapiInstance) {
    console.error('Vapi instance not initialized');
    throw new Error('Vapi instance not initialized');
  }

  console.log('Vapi instance created successfully');

  try {
    // Check if we're in a browser environment
    if (typeof window === 'undefined') {
      console.error('Not in browser environment, cannot start Vapi call');
      throw new Error('Cannot start Vapi call outside of browser environment');
    }

    // Log the current domain for debugging
    console.log('Starting call from domain:', window.location.hostname);

    // Save call configuration for potential reconnection
    console.log('Saving call configuration...');
    saveCallConfig({
      workflowId: typeof workflowIdOrAssistant === 'string' ? workflowIdOrAssistant : undefined,
      assistantConfig: typeof workflowIdOrAssistant !== 'string' ? workflowIdOrAssistant : undefined,
      variableValues: options?.variableValues
    });
    console.log('Call configuration saved');

    // Check if the start method exists
    if (!vapiInstance || typeof vapiInstance.start !== 'function') {
      console.error('Vapi instance does not have a start method');
      throw new Error('Invalid Vapi instance: missing start method');
    }

    // Start the call with a timeout and better error handling
    console.log('Starting Vapi call...');

    try {
      // Ensure workflowIdOrAssistant is properly formatted
      let callParam = workflowIdOrAssistant;

      // If it's a string (workflow ID), make sure it's a valid string
      if (typeof workflowIdOrAssistant === 'string') {
        console.log('Using workflow ID directly:', workflowIdOrAssistant);
        callParam = workflowIdOrAssistant;
      }
      // If it's an object, make sure it's properly formatted
      else if (typeof workflowIdOrAssistant === 'object' && workflowIdOrAssistant !== null) {
        console.log('Using assistant config object');
        callParam = workflowIdOrAssistant;
      }
      else {
        console.error('Invalid workflow ID or assistant config:', workflowIdOrAssistant);
        throw new Error('Invalid workflow ID or assistant config');
      }

      // Log the final call parameters
      console.log('Final call parameters:', {
        callParam,
        options
      });

      // According to documentation, start() returns a promise that resolves to a call object
      // Make sure we're using the workflow ID as a string
      if (typeof callParam === 'string') {
        console.log('Starting call with string workflow ID:', callParam);
        const result = await vapiInstance.start(callParam, options);
        console.log('Vapi call started with result:', result);
      } else {
        console.error('Invalid workflow ID format. Must be a string.');
        throw new Error('Invalid workflow ID format. Must be a string.');
      }

      // Update connection state
      connectionState.isConnected = true;
      connectionState.lastPingTime = Date.now();
      connectionState.reconnectAttempts = 0;
      console.log('Connection state updated:', connectionState);

      return result;
    } catch (startError) {
      console.error('Error starting Vapi call:', startError);

      // Check for specific error types
      if (startError && typeof startError === 'object') {
        const errorStr = String(startError);

        if (errorStr.includes('unauthorized') || errorStr.includes('domain')) {
          console.error('Domain authorization error detected during call start');
          throw new Error(`Domain authorization error: Please add ${window.location.hostname} to your Vapi authorized domains`);
        }

        if (errorStr.includes('microphone') || errorStr.includes('audio') || errorStr.includes('permission')) {
          console.error('Microphone permission error detected');
          throw new Error('Microphone access is required. Please grant microphone permissions and try again.');
        }

        if (errorStr.includes('404') || errorStr.includes('Not Found')) {
          console.error('API endpoint not found error detected');
          throw new Error('API endpoint not found. This might be due to an incorrect workflow ID or API configuration.');
        }
      }

      // Re-throw the original error with more context
      throw new Error(`Failed to start Vapi call: ${startError instanceof Error ? startError.message : String(startError)}`);
    }
  } catch (error) {
    console.error('Failed to start call:', error);

    // Try to clean up
    try {
      if (vapiInstance && typeof vapiInstance.stop === 'function') {
        console.log('Attempting to stop Vapi instance after error');
        await vapiInstance.stop();
      }
    } catch (stopError) {
      console.warn('Error stopping Vapi instance after failed start:', stopError);
    }

    // Reset the instance after an error
    resetVapiInstance();

    throw error;
  }
}

// For backward compatibility with existing code
export const vapi = getVapiInstance();
