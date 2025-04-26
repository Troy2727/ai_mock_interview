/**
 * Ejection state management for Vapi
 * 
 * This file provides utilities for managing the global ejection state
 * to prevent duplicate handling of ejection errors.
 */

// Define the ejection state interface
export interface VapiEjectionState {
  isEjected: boolean;
  isHandlingEjection: boolean;
  ejectionTime: number | null;
  ejectionError: Error | null;
}

/**
 * Initialize the global ejection state if it doesn't exist
 */
export function initEjectionState(): void {
  if (typeof window !== 'undefined' && !(window as any).__VAPI_EJECTION_STATE__) {
    (window as any).__VAPI_EJECTION_STATE__ = {
      isEjected: false,
      isHandlingEjection: false,
      ejectionTime: null,
      ejectionError: null
    };
  }
}

/**
 * Get the current ejection state
 * @returns The current ejection state or null if not in browser
 */
export function getEjectionState(): VapiEjectionState | null {
  if (typeof window !== 'undefined') {
    // Initialize if not exists
    initEjectionState();
    return (window as any).__VAPI_EJECTION_STATE__;
  }
  return null;
}

/**
 * Set the ejection state
 * @param state Partial ejection state to update
 */
export function setEjectionState(state: Partial<VapiEjectionState>): void {
  if (typeof window !== 'undefined') {
    // Initialize if not exists
    initEjectionState();
    
    // Update the state
    (window as any).__VAPI_EJECTION_STATE__ = {
      ...(window as any).__VAPI_EJECTION_STATE__,
      ...state
    };
  }
}

/**
 * Reset the ejection state
 */
export function resetEjectionState(): void {
  if (typeof window !== 'undefined') {
    (window as any).__VAPI_EJECTION_STATE__ = {
      isEjected: false,
      isHandlingEjection: false,
      ejectionTime: null,
      ejectionError: null
    };
  }
}

/**
 * Check if the meeting is currently ejected
 * @returns True if the meeting is ejected, false otherwise
 */
export function isEjected(): boolean {
  return getEjectionState()?.isEjected || false;
}

/**
 * Check if an ejection is currently being handled
 * @returns True if an ejection is being handled, false otherwise
 */
export function isHandlingEjection(): boolean {
  return getEjectionState()?.isHandlingEjection || false;
}
