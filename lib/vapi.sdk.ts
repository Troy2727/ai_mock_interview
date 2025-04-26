/**
 * This file is now a wrapper around the modular Vapi SDK implementation.
 * It re-exports all the functionality from the new modular structure
 * to maintain backward compatibility with existing code.
 */

import { setEjectionErrorHandler, initWebSocketPatch } from './websocket-patch';
import { setGlobalEjectionErrorHandler, initGlobalErrorHandlers } from './global-error-handler';
import {
  getVapiInstance,
  resetVapiInstance,
  saveCallConfig,
  startEnhancedCall,
  vapi
} from './vapi/index';
import { initEjectionState, isHandlingEjection } from './vapi/ejection-state';

// Initialize error handlers
if (typeof window !== 'undefined') {
  // Initialize ejection state
  initEjectionState();

  // Initialize global error handlers first
  initGlobalErrorHandlers();

  // Initialize WebSocket patch
  initWebSocketPatch();

  // Set up the WebSocket ejection error handler
  setEjectionErrorHandler((error) => {
    // Check if we're already handling an ejection
    if (isHandlingEjection()) {
      console.log('Already handling an ejection, ignoring WebSocket ejection');
      return;
    }

    console.warn('WebSocket ejection error detected:', error);

    // Import dynamically to avoid circular dependencies
    import('./vapi/error-handling').then(({ handleEjectionError }) => {
      handleEjectionError(error);
    });
  });

  // Set up the global ejection error handler
  setGlobalEjectionErrorHandler((error) => {
    // Check if we're already handling an ejection
    if (isHandlingEjection()) {
      console.log('Already handling an ejection, ignoring global ejection');
      return;
    }

    console.warn('Global ejection error detected:', error);

    // Import dynamically to avoid circular dependencies
    import('./vapi/error-handling').then(({ handleEjectionError }) => {
      handleEjectionError(error);
    });
  });
}

// Re-export everything
export {
  getVapiInstance,
  resetVapiInstance,
  saveCallConfig,
  startEnhancedCall,
  vapi
};

// Re-export ejection state utilities
export {
  isEjected,
  isHandlingEjection,
  resetEjectionState,
  setEjectionState
} from './vapi/ejection-state';