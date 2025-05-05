// Import error handler first to override console.error
import './errorHandler';

// Import custom popup handler
import { suppressCOOPWarnings } from './customPopup';

// Initialize COOP warning suppression
suppressCOOPWarnings();

// Re-export everything from client
export * from './client';

// This file serves as the main entry point for Firebase-related functionality
console.log('Firebase module initialized with custom error handling and COOP warning suppression');
