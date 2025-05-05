/**
 * Get the base URL for API requests
 * This function returns the appropriate base URL depending on the environment
 */
export function getApiBaseUrl(): string {
  // Check if we're in a browser environment
  if (typeof window !== 'undefined') {
    // In the browser, use the current origin
    return window.location.origin;
  }
  
  // In server-side code, use the environment variable or default to localhost
  return process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
}

/**
 * Get the full URL for a specific API endpoint
 * @param endpoint The API endpoint path (e.g., '/api/google-auth')
 * @returns The full URL for the API endpoint
 */
export function getApiUrl(endpoint: string): string {
  const baseUrl = getApiBaseUrl();
  
  // Ensure the endpoint starts with a slash
  const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  
  return `${baseUrl}${normalizedEndpoint}`;
}
