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
  const vapiInstance = getVapiInstance();
  if (!vapiInstance) {
    throw new Error('Vapi instance not initialized');
  }

  try {
    // Save call configuration for potential reconnection
    saveCallConfig({
      workflowId: typeof workflowIdOrAssistant === 'string' ? workflowIdOrAssistant : undefined,
      assistantConfig: typeof workflowIdOrAssistant !== 'string' ? workflowIdOrAssistant : undefined,
      variableValues: options?.variableValues
    });

    // Start the call
    await vapiInstance.start(workflowIdOrAssistant, options);

    // Update connection state
    connectionState.isConnected = true;
    connectionState.lastPingTime = Date.now();
    connectionState.reconnectAttempts = 0;
  } catch (error) {
    console.error('Failed to start call:', error);
    throw error;
  }
}

// For backward compatibility with existing code
export const vapi = getVapiInstance();
