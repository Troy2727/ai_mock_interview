/**
 * Vapi configuration utilities
 * These functions help determine the correct settings for Vapi based on the current environment
 */

/**
 * Get the current domain for Vapi configuration
 * @returns The current domain (hostname)
 */
export function getCurrentDomain(): string {
  if (typeof window !== 'undefined') {
    return window.location.hostname;
  }
  return 'localhost';
}

/**
 * Check if the current domain is authorized for Vapi
 * @returns Boolean indicating if the domain is authorized
 */
export function isAuthorizedDomain(): boolean {
  const domain = getCurrentDomain();
  
  // List of domains that are authorized in your Vapi account
  const authorizedDomains = [
    'localhost',
    '127.0.0.1',
    'ai-mock-interview-ten-snowy.vercel.app'
  ];
  
  return authorizedDomains.includes(domain);
}

/**
 * Get the callback URL for Vapi to redirect to after a workflow completes
 * @param path The path to redirect to (default: '/dashboard')
 * @returns The full callback URL
 */
export function getVapiCallbackUrl(path: string = '/dashboard'): string {
  const baseUrl = getBaseUrl();
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${baseUrl}${normalizedPath}`;
}

/**
 * Get the base URL for the application
 * @returns The base URL to use for the application
 */
export function getBaseUrl(): string {
  // Use the environment variable if available
  if (process.env.NEXT_PUBLIC_BASE_URL) {
    return process.env.NEXT_PUBLIC_BASE_URL;
  }
  
  // Fallback to determining based on environment
  if (typeof window !== 'undefined') {
    const protocol = window.location.protocol;
    const hostname = window.location.hostname;
    const port = window.location.port ? `:${window.location.port}` : '';
    return `${protocol}//${hostname}${port}`;
  }
  
  // Default fallback for server-side
  return 'http://localhost:3000';
}

/**
 * Get the Vapi web token
 * @returns The Vapi web token from environment variables
 */
export function getVapiWebToken(): string {
  return process.env.NEXT_PUBLIC_VAPI_WEB_TOKEN || '';
}

/**
 * Get the Vapi workflow ID
 * @returns The Vapi workflow ID from environment variables
 */
export function getVapiWorkflowId(): string {
  return process.env.NEXT_PUBLIC_VAPI_WORKFLOW_ID || '';
}

/**
 * Create options for a Vapi workflow call with variable values and callback URL
 * @param variableValues Values to pass to the workflow
 * @param redirectPath Path to redirect to after the workflow completes
 * @returns Options object for Vapi workflow
 */
export function createWorkflowOptions(
  variableValues: Record<string, string> = {},
  redirectPath: string = '/dashboard'
): any {
  // Create the callback URL with the redirect path
  const callbackUrl = getVapiCallbackUrl(redirectPath);
  
  // Create the options object with assistantOverrides and callback URL
  return {
    assistantOverrides: {
      variableValues: variableValues
    },
    callbackUrl: callbackUrl
  };
}
