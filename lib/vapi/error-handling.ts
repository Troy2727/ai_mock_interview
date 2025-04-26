/**
 * Error handling for Vapi
 */
import { connectionState, stopKeepAlive } from './connection';
import { getVapiInstance } from './instance';
import { isEjected, isHandlingEjection, setEjectionState } from './ejection-state';

/**
 * Handle ejection error (meeting ended)
 * @param error Optional error that caused the ejection
 */
export function handleEjectionError(error?: Error): void {
  // Use the global ejection state to prevent duplicate handling
  if (typeof window !== 'undefined') {
    // If we're already ejected, just log and return
    if (isEjected()) {
      console.log('Meeting already ejected, ignoring duplicate ejection');
      return;
    }

    // If we're already handling an ejection, just log and return
    if (isHandlingEjection()) {
      console.log('Already handling an ejection error, ignoring duplicate');
      return;
    }

    // Update the global ejection state
    setEjectionState({
      isHandlingEjection: true,
      ejectionTime: Date.now(),
      ejectionError: error
    });
  }

  console.warn('Vapi meeting ejection detected:', error);

  // Mark the connection as inactive immediately
  connectionState.isConnected = false;

  // Stop keep-alive and connection monitoring
  stopKeepAlive();

  // Notify about ejection
  if (connectionState.onEjection) {
    try {
      connectionState.onEjection(error);
    } catch (notifyError) {
      console.error('Error in ejection notification callback:', notifyError);
    }
  }

  // Force cleanup of the current instance
  try {
    const vapiInstance = getVapiInstance();
    if (vapiInstance) {
      console.log('Forcibly stopping and cleaning up Vapi instance');

      try {
        vapiInstance.stop();
      } catch (stopError) {
        console.warn('Error stopping Vapi instance:', stopError);
      }

      try {
        vapiInstance.removeAllListeners();
      } catch (listenerError) {
        console.warn('Error removing listeners:', listenerError);
      }

      // Force reset the instance
      // We'll import this dynamically to avoid circular dependencies
      import('./instance').then(({ resetInstance }) => {
        resetInstance();
      });
    }
  } catch (cleanupError) {
    console.error('Error during forced cleanup:', cleanupError);
  }

  // Check if we should attempt to reconnect
  if (connectionState.currentCallConfig &&
      connectionState.ejectionReconnectAttempts < connectionState.maxEjectionReconnectAttempts) {

    console.log(`Planning reconnection after ejection (attempt ${connectionState.ejectionReconnectAttempts + 1}/${connectionState.maxEjectionReconnectAttempts})...`);

    // Wait a bit longer before reconnecting after ejection (3-7 seconds)
    // Use a shorter initial delay to improve user experience
    const backoffTime = 3000 + (connectionState.ejectionReconnectAttempts * 2000);

    console.log(`Will attempt reconnection in ${backoffTime/1000} seconds...`);

    // Use setTimeout to delay the reconnection attempt
    setTimeout(() => {
      // Only increment the counter right before making the actual attempt
      connectionState.ejectionReconnectAttempts++;

      // Reset the handling flag before attempting reconnection
      setEjectionState({
        isHandlingEjection: false
      });

      // We'll import this dynamically to avoid circular dependencies
      import('./reconnection').then(({ attemptReconnectAfterEjection }) => {
        attemptReconnectAfterEjection();
      });
    }, backoffTime);
  } else if (connectionState.ejectionReconnectAttempts >= connectionState.maxEjectionReconnectAttempts) {
    // Max reconnect attempts reached
    console.error('Maximum ejection reconnection attempts reached');

    // Reset the handling flag
    setEjectionState({
      isHandlingEjection: false
    });

    if (connectionState.onReconnectFailed) {
      connectionState.onReconnectFailed(new Error('Maximum ejection reconnection attempts reached'));
    }
  } else {
    // Mark the ejection as complete in the global state
    setEjectionState({
      isEjected: true,
      isHandlingEjection: false
    });
  }
}

/**
 * Handle connection lost event
 * @param error Optional error that caused the connection loss
 */
export function handleConnectionLost(error?: Error): void {
  console.warn('Vapi connection lost', error);

  // Stop keep-alive and connection monitoring
  stopKeepAlive();

  // Notify connection lost
  if (connectionState.onConnectionLost) {
    connectionState.onConnectionLost(error);
  }

  // Attempt to reconnect if we have call config
  if (connectionState.currentCallConfig &&
      connectionState.reconnectAttempts < connectionState.maxReconnectAttempts) {

    connectionState.reconnectAttempts++;
    console.log(`Attempting to reconnect (${connectionState.reconnectAttempts}/${connectionState.maxReconnectAttempts})...`);

    // Wait a bit before reconnecting (with exponential backoff)
    const backoffTime = Math.min(1000 * Math.pow(2, connectionState.reconnectAttempts - 1), 10000);

    setTimeout(() => {
      // We'll import this dynamically to avoid circular dependencies
      import('./reconnection').then(({ attemptReconnect }) => {
        attemptReconnect();
      });
    }, backoffTime);
  } else if (connectionState.reconnectAttempts >= connectionState.maxReconnectAttempts) {
    // Max reconnect attempts reached
    if (connectionState.onReconnectFailed) {
      connectionState.onReconnectFailed(new Error('Maximum reconnection attempts reached'));
    }
  }
}
