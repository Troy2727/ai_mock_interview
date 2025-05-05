/**
 * Custom error handler for Firebase authentication
 * This file contains utilities to handle Firebase auth errors
 */

// Original console functions
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

// Override console.error to filter out popup-closed-by-user errors
console.error = function(...args: any[]) {
  // Check if this is a Firebase popup-closed-by-user error
  const errorString = args.join(' ');
  if (
    errorString.includes('auth/popup-closed-by-user') ||
    (args[0] && args[0].code === 'auth/popup-closed-by-user')
  ) {
    // Replace with a more subtle console.log
    console.log('User closed the authentication popup window');
    return;
  }

  // Check if this is a COOP-related error
  if (
    errorString.includes('Cross-Origin-Opener-Policy') ||
    errorString.includes('COOP') ||
    errorString.includes('message port closed') ||
    errorString.includes('window.closed')
  ) {
    // Replace with a more subtle console.log
    console.log('Suppressed COOP error');
    return;
  }

  // For all other errors, use the original console.error
  originalConsoleError.apply(console, args);
};

// Override console.warn to filter out COOP warnings
console.warn = function(...args: any[]) {
  // Check if this is a COOP-related warning
  const warningString = args.join(' ');
  if (
    warningString.includes('Cross-Origin-Opener-Policy') ||
    warningString.includes('COOP') ||
    warningString.includes('message port closed') ||
    warningString.includes('window.closed') ||
    warningString.includes('The message port closed before a response was received')
  ) {
    // Replace with a more subtle console.log
    console.log('Suppressed browser security warning');
    return;
  }

  // For all other warnings, use the original console.warn
  originalConsoleWarn.apply(console, args);
};

/**
 * Check if an error is a popup-closed-by-user error
 */
export const isPopupClosedError = (error: any): boolean => {
  return (
    error &&
    (error.code === 'auth/popup-closed-by-user' ||
     (typeof error.message === 'string' && error.message.includes('popup-closed-by-user')))
  );
};

/**
 * Handle Firebase authentication errors
 */
export const handleFirebaseAuthError = (error: any): string => {
  if (!error) return 'Unknown error occurred';

  // Don't treat popup-closed-by-user as an error
  if (isPopupClosedError(error)) {
    return '';
  }

  // Handle other common Firebase auth errors
  switch (error.code) {
    case 'auth/invalid-api-key':
      return 'Authentication configuration error. Please contact support.';
    case 'auth/network-request-failed':
      return 'Network error. Please check your internet connection.';
    case 'auth/unauthorized-domain':
      return 'This domain is not authorized for authentication. Please contact support.';
    case 'auth/user-disabled':
      return 'This account has been disabled. Please contact support.';
    case 'auth/account-exists-with-different-credential':
      return 'An account already exists with the same email address but different sign-in credentials.';
    case 'auth/invalid-credential':
      return 'Invalid credentials. Please try again.';
    case 'auth/user-not-found':
      return 'User not found. Please check your email or sign up for a new account.';
    case 'auth/wrong-password':
      return 'Incorrect password. Please try again.';
    case 'auth/email-already-in-use':
      return 'Email already in use. Please sign in instead.';
    case 'auth/weak-password':
      return 'Password is too weak. Please use a stronger password.';
    default:
      return `Authentication error: ${error.message || 'Unknown error'}`;
  }
};
