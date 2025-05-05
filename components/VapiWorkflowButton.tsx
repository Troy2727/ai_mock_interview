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
      toast.error(`Error starting interview: ${error instanceof Error ? error.message : String(error)}`);
      if (onError) onError(error instanceof Error ? error : new Error(String(error)));
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <button
      onClick={startWorkflow}
      disabled={isLoading || !hasMicPermission || !isDomainAuthorized}
      className={`px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 ${className}`}
    >
      {isLoading ? 'Starting...' : buttonText}
    </button>
  );
}
