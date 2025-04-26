/**
 * Reconnection logic for Vapi
 */
import { connectionState, startKeepAlive } from './connection';
import { getVapiInstance, resetInstance } from './instance';
import { handleConnectionLost, handleEjectionError } from './error-handling';

/**
 * Attempt to reconnect to Vapi after ejection
 */
export async function attemptReconnectAfterEjection(): Promise<void> {
  // Store the current call config before we do anything else
  const savedCallConfig = connectionState.currentCallConfig;

  if (!savedCallConfig) {
    console.error('No call configuration available for reconnection');
    if (connectionState.onReconnectFailed) {
      connectionState.onReconnectFailed(new Error('No call configuration available for reconnection'));
    }
    return;
  }

  try {
    console.log('Attempting to reconnect after ejection with a completely new Vapi instance');

    // First, completely clean up the existing instance
    let vapiInstance = getVapiInstance();
    if (vapiInstance) {
      try {
        // Stop any ongoing call
        vapiInstance.stop();
      } catch (stopError) {
        console.warn('Error stopping Vapi instance before reconnection:', stopError);
        // Continue anyway - we're creating a new instance
      }

      // Remove all event listeners to prevent memory leaks
      try {
        vapiInstance.removeAllListeners();
      } catch (error) {
        console.warn('Error removing event listeners:', error);
      }
    }

    // Wait a moment to ensure everything is cleaned up
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Reset the instance to null
    resetInstance();

    // Wait another moment before creating a new instance
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Create a completely new Vapi instance
    if (process.env.NEXT_PUBLIC_VAPI_WEB_TOKEN) {
      vapiInstance = getVapiInstance();

      // Set up basic event listeners on the new instance
      vapiInstance.on('error', (error) => {
        console.error('New Vapi instance error:', error);
      });

      vapiInstance.on('call-start', () => {
        console.log('New call started successfully after ejection');
        connectionState.isConnected = true;
        connectionState.lastPingTime = Date.now();
      });

      vapiInstance.on('call-end', () => {
        console.log('Call ended on new instance');
        connectionState.isConnected = false;
      });
    } else {
      throw new Error('NEXT_PUBLIC_VAPI_WEB_TOKEN is not defined');
    }

    // Wait a moment before starting a new call
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Restart the call with the saved configuration
    if (savedCallConfig.workflowId) {
      console.log('Starting new call with workflow ID:', savedCallConfig.workflowId);
      await vapiInstance.start(
        savedCallConfig.workflowId,
        {
          variableValues: savedCallConfig.variableValues || {}
        }
      );
    } else if (savedCallConfig.assistantConfig) {
      console.log('Starting new call with assistant config');
      await vapiInstance.start(
        savedCallConfig.assistantConfig,
        {
          variableValues: savedCallConfig.variableValues || {}
        }
      );
    } else {
      throw new Error('Invalid call configuration');
    }

    // Reconnection successful
    connectionState.isConnected = true;
    connectionState.lastPingTime = Date.now();
    connectionState.currentCallConfig = savedCallConfig; // Restore the saved config
    startKeepAlive(vapiInstance);

    console.log('Successfully reconnected after ejection!');

    if (connectionState.onReconnectSuccess) {
      connectionState.onReconnectSuccess();
    }
  } catch (error) {
    console.error('Ejection reconnection attempt failed:', error);

    // Try again if we haven't reached max attempts
    if (connectionState.ejectionReconnectAttempts < connectionState.maxEjectionReconnectAttempts) {
      // Wait longer between attempts for ejection errors
      const retryDelay = 5000 + (connectionState.ejectionReconnectAttempts * 2000);
      console.log(`Will retry reconnection in ${retryDelay/1000} seconds...`);

      setTimeout(() => {
        // Increment the attempt counter here to ensure it's only incremented once per attempt
        connectionState.ejectionReconnectAttempts++;
        handleEjectionError(error instanceof Error ? error : new Error('Ejection reconnection failed'));
      }, retryDelay);
    } else if (connectionState.onReconnectFailed) {
      console.error('Maximum ejection reconnection attempts reached');
      connectionState.onReconnectFailed(error instanceof Error ? error : new Error('Maximum ejection reconnection attempts reached'));
    }
  }
}

/**
 * Attempt to reconnect to Vapi
 */
export async function attemptReconnect(): Promise<void> {
  const vapiInstance = getVapiInstance();
  if (!vapiInstance || !connectionState.currentCallConfig) {
    return;
  }

  try {
    // Restart the call with the saved configuration
    if (connectionState.currentCallConfig.workflowId) {
      await vapiInstance.start(
        connectionState.currentCallConfig.workflowId,
        {
          variableValues: connectionState.currentCallConfig.variableValues || {}
        }
      );
    } else if (connectionState.currentCallConfig.assistantConfig) {
      await vapiInstance.start(
        connectionState.currentCallConfig.assistantConfig,
        {
          variableValues: connectionState.currentCallConfig.variableValues || {}
        }
      );
    }

    // Reconnection successful
    if (connectionState.onReconnectSuccess) {
      connectionState.onReconnectSuccess();
    }
  } catch (error) {
    console.error('Reconnection attempt failed:', error);

    // Try again if we haven't reached max attempts
    if (connectionState.reconnectAttempts < connectionState.maxReconnectAttempts) {
      handleConnectionLost(error instanceof Error ? error : new Error('Reconnection failed'));
    } else if (connectionState.onReconnectFailed) {
      connectionState.onReconnectFailed(error instanceof Error ? error : new Error('Reconnection failed'));
    }
  }
}
