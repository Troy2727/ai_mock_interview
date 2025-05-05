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
    // Try to use signInWithRedirect first if we're in a browser environment
    if (typeof window !== 'undefined') {
      try {
        // Import Firebase auth functions dynamically to avoid circular dependencies
        const { signInWithPopup, signInWithRedirect, getRedirectResult } = await import('firebase/auth');

        // Check if we have a redirect result (user is coming back from auth redirect)
        const redirectResult = await getRedirectResult(auth).catch(e => {
          console.log('No redirect result or error getting it:', e.message);
          return null;
        });

        if (redirectResult) {
          console.log('User authenticated via redirect');
          return redirectResult;
        }

        // If we're on localhost, use popup (better for development)
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
          console.log('Using popup for localhost authentication');
          return await signInWithPopup(auth, provider);
        }

        // For production domains, try popup first but fall back to redirect
        try {
          console.log('Attempting popup authentication');
          return await signInWithPopup(auth, provider);
        } catch (popupError: any) {
          // If we get an unauthorized domain error, try redirect instead
          if (popupError.code === 'auth/unauthorized-domain' ||
              popupError.code === 'auth/popup-blocked' ||
              popupError.code === 'auth/popup-closed-by-user') {
            console.log('Popup failed, falling back to redirect authentication');
            // Store that we're expecting a redirect
            localStorage.setItem('auth_redirect_pending', 'true');
            // Use redirect method instead
            await signInWithRedirect(auth, provider);
            return null; // This will redirect the page, so we won't actually return
          }
          throw popupError;
        }
      } catch (error: any) {
        console.error('Error during authentication flow:', error);
        throw error;
      }
    } else {
      // Server-side - just use the standard popup method
      const { signInWithPopup } = await import('firebase/auth');
      return await signInWithPopup(auth, provider);
    }
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
