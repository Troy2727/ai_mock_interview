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
  workflowIdOrAssistant: string | any,
  options?: { variableValues?: Record<string, any> }
): Promise<void> {
  console.log('startEnhancedCall called with:', {
    workflowId: typeof workflowIdOrAssistant === 'string' ? workflowIdOrAssistant : 'custom assistant config',
    options
  });

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
    // Save call configuration for potential reconnection
    console.log('Saving call configuration...');
    saveCallConfig({
      workflowId: typeof workflowIdOrAssistant === 'string' ? workflowIdOrAssistant : undefined,
      assistantConfig: typeof workflowIdOrAssistant !== 'string' ? workflowIdOrAssistant : undefined,
      variableValues: options?.variableValues
    });
    console.log('Call configuration saved');

    // Check if the start method exists
    if (typeof vapiInstance.start !== 'function') {
      console.error('Vapi instance does not have a start method');
      throw new Error('Invalid Vapi instance: missing start method');
    }

    // Start the call with a timeout
    console.log('Starting Vapi call...');

    // According to documentation, start() returns a promise that resolves to a call object
    // We'll use a simple approach without the race to avoid complexity
    const result = await vapiInstance.start(workflowIdOrAssistant, options);
    console.log('Vapi call started with result:', result);

    // Update connection state
    connectionState.isConnected = true;
    connectionState.lastPingTime = Date.now();
    connectionState.reconnectAttempts = 0;
    console.log('Connection state updated:', connectionState);

    return result;
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
