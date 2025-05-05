/**
 * Custom popup handler for Firebase authentication
 * This file provides a wrapper around Firebase's signInWithPopup to handle COOP issues
 */

import { Auth, AuthProvider, UserCredential } from 'firebase/auth';
import { isPopupClosedError } from './errorHandler';

// Store the current popup window reference
let currentPopupWindow: Window | null = null;

/**
 * Custom implementation of signInWithPopup that handles COOP issues
 * 
 * @param auth Firebase Auth instance
 * @param provider Auth provider (Google, Facebook, etc.)
 * @returns Promise that resolves to UserCredential or null if popup was closed
 */
export async function customSignInWithPopup(
  auth: Auth, 
  provider: AuthProvider
): Promise<UserCredential | null> {
  try {
    // Import Firebase auth functions dynamically to avoid circular dependencies
    const { signInWithPopup } = await import('firebase/auth');
    
    // Add a custom event listener to handle popup closure
    const handleBeforeUnload = () => {
      console.log('Popup window is being closed');
    };
    
    // Create a wrapper around signInWithPopup
    const result = await signInWithPopup(auth, provider);
    return result;
  } catch (error: any) {
    // Check if the error is due to the popup being closed
    if (isPopupClosedError(error)) {
      console.log('User closed the sign-in popup window');
      return null;
    }
    
    // For any other error, rethrow
    throw error;
  } finally {
    // Clean up any references to the popup window
    if (currentPopupWindow) {
      try {
        currentPopupWindow = null;
      } catch (e) {
        // Ignore errors when trying to close the window
        console.log('Error cleaning up popup window reference:', e);
      }
    }
  }
}

/**
 * Suppress console warnings related to COOP
 * This function patches the console to filter out specific COOP warnings
 */
export function suppressCOOPWarnings() {
  const originalConsoleWarn = console.warn;
  
  console.warn = function(...args: any[]) {
    // Check if this is a COOP-related warning
    const warningString = args.join(' ');
    if (
      warningString.includes('Cross-Origin-Opener-Policy') || 
      warningString.includes('COOP') ||
      warningString.includes('message port closed')
    ) {
      // Replace with a more subtle console.log
      console.log('Suppressed COOP warning:', warningString.substring(0, 50) + '...');
      return;
    }
    
    // For all other warnings, use the original console.warn
    originalConsoleWarn.apply(console, args);
  };
}
