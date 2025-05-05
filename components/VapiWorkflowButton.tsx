'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { getVapiInstance } from '@/lib/vapi.sdk';
import {
  getVapiWorkflowId,
  createWorkflowOptions,
  getBaseUrl,
  isAuthorizedDomain
} from '@/lib/vapi/config';
import VapiErrorHandler from './VapiErrorHandler';

interface VapiWorkflowButtonProps {
  buttonText?: string;
  className?: string;
  redirectPath?: string;
  variableValues?: Record<string, string>;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

export default function VapiWorkflowButton({
  buttonText = 'Start Interview',
  className = '',
  redirectPath = '/dashboard',
  variableValues = {},
  onSuccess,
  onError
}: VapiWorkflowButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [hasMicPermission, setHasMicPermission] = useState<boolean | null>(null);
  const [isDomainAuthorized, setIsDomainAuthorized] = useState<boolean | null>(null);
  const [showErrorHandler, setShowErrorHandler] = useState(false);

  // Check microphone permission and domain authorization on component mount
  useEffect(() => {
    const checkMicrophonePermission = async () => {
      try {
        // Check if the browser supports getUserMedia
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          console.error('Browser does not support getUserMedia API');
          setHasMicPermission(false);
          return;
        }

        // Try to get microphone access
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

        // If we get here, permission was granted
        console.log('Microphone permission granted');
        setHasMicPermission(true);

        // Stop all tracks to release the microphone
        stream.getTracks().forEach(track => track.stop());
      } catch (error) {
        console.error('Error checking microphone permission:', error);
        setHasMicPermission(false);
      }
    };

    // Check if the current domain is authorized for Vapi
    const checkDomainAuthorization = () => {
      const authorized = isAuthorizedDomain();
      console.log('Domain authorization check:', authorized);
      setIsDomainAuthorized(authorized);
    };

    checkMicrophonePermission();
    checkDomainAuthorization();
  }, []);

  const startWorkflow = async () => {
    try {
      // Check if microphone permission is granted
      if (!hasMicPermission) {
        toast.error('Microphone access is required. Please enable it in your browser settings.');
        return;
      }

      // Check if domain is authorized
      if (!isDomainAuthorized) {
        toast.error(`This domain is not authorized for Vapi. Please add ${window.location.hostname} to your Vapi authorized domains.`);
        return;
      }

      setIsLoading(true);
      toast.info('Starting interview...');

      // Get the Vapi instance
      const vapiInstance = getVapiInstance({
        onError: (error) => {
          console.error('Vapi error:', error);
          toast.error(`Vapi error: ${error.message}`);
          if (onError) onError(error);
        }
      });

      // Get the workflow ID from environment variables
      const workflowId = getVapiWorkflowId();

      if (!workflowId) {
        const error = new Error('No workflow ID configured. Please check your environment variables.');
        toast.error(error.message);
        if (onError) onError(error);
        return;
      }

      // Merge default variable values with provided ones
      const mergedVariables = {
        redirectUrl: `${getBaseUrl()}${redirectPath}`,
        ...variableValues
      };

      // Create options with callback URL
      const options = createWorkflowOptions(mergedVariables, redirectPath);

      console.log('Starting workflow with ID:', workflowId);
      console.log('Options:', options);

      // Start the workflow
      await vapiInstance.start(workflowId, options);

      toast.success('Interview started successfully!');
      if (onSuccess) onSuccess();
    } catch (error) {
      console.error('Error starting workflow:', error);

      // Improved error handling for different error types
      let errorMessage = 'Unknown error occurred';

      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (error instanceof Response) {
        // Handle Response object errors (common with fetch API)
        errorMessage = `API Error: ${error.status} ${error.statusText}`;
        // Try to extract more details from the response
        error.text().then(text => {
          try {
            const jsonError = JSON.parse(text);
            console.error('API Error Details:', jsonError);
            toast.error(`API Error: ${jsonError.message || jsonError.error || text}`);
          } catch (e) {
            console.error('Raw API Error:', text);
            toast.error(`API Error: ${text.substring(0, 100)}`);
          }
        }).catch(e => {
          console.error('Could not parse error response:', e);
        });
      } else if (typeof error === 'object' && error !== null) {
        // Try to extract useful information from object errors
        errorMessage = JSON.stringify(error);
      } else {
        errorMessage = String(error);
      }

      console.error('Formatted error message:', errorMessage);
      toast.error(`Error starting interview: ${errorMessage}`);

      // Show the error handler component
      setShowErrorHandler(true);

      if (onError) onError(error instanceof Error ? error : new Error(errorMessage));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <button
        onClick={startWorkflow}
        disabled={isLoading || !hasMicPermission || !isDomainAuthorized}
        className={`px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 ${className}`}
      >
        {isLoading ? 'Starting...' : buttonText}
      </button>

      {/* Show error handler if there was an error */}
      {showErrorHandler && (
        <VapiErrorHandler
          onRetry={() => {
            setShowErrorHandler(false);
            startWorkflow();
          }}
        />
      )}

      {/* Show warnings if permissions or domain authorization is missing */}
      {!hasMicPermission && !isLoading && (
        <div className="mt-2 text-yellow-500 text-sm">
          Microphone permission is required. Please enable it in your browser settings.
        </div>
      )}

      {!isDomainAuthorized && !isLoading && (
        <div className="mt-2 text-yellow-500 text-sm">
          This domain is not authorized for Vapi. Please add {typeof window !== 'undefined' ? window.location.hostname : 'your domain'} to your Vapi authorized domains.
        </div>
      )}
    </div>
  );
}
