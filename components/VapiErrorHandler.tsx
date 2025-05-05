'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';

interface VapiErrorHandlerProps {
  onRetry?: () => void;
}

export default function VapiErrorHandler({ onRetry }: VapiErrorHandlerProps) {
  const [domainInfo, setDomainInfo] = useState<string>('');
  
  useEffect(() => {
    // Get current domain information for troubleshooting
    if (typeof window !== 'undefined') {
      setDomainInfo(window.location.hostname);
    }
  }, []);
  
  // Function to check if the domain is authorized in Vapi
  const checkDomainAuthorization = async () => {
    try {
      // This is a simple check - it will try to make a request to Vapi's API
      // If the domain is not authorized, it will return a 401 error
      const response = await fetch('https://api.vapi.ai/status', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        toast.success('Your domain appears to be authorized with Vapi');
        return true;
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('Domain authorization check failed:', errorData);
        toast.error(`Domain authorization check failed: ${response.status} ${response.statusText}`);
        return false;
      }
    } catch (error) {
      console.error('Error checking domain authorization:', error);
      toast.error('Could not check domain authorization');
      return false;
    }
  };
  
  // Function to check microphone permissions
  const checkMicrophonePermission = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());
      toast.success('Microphone permission granted');
      return true;
    } catch (error) {
      console.error('Microphone permission check failed:', error);
      toast.error('Microphone permission denied or not available');
      return false;
    }
  };
  
  return (
    <div className="p-4 bg-red-900/20 rounded-lg my-4">
      <h2 className="text-xl font-semibold mb-2 text-red-400">Vapi Error Detected</h2>
      <p className="mb-4">
        There was an error connecting to Vapi. This could be due to one of the following issues:
      </p>
      
      <ul className="list-disc pl-6 mb-4 space-y-2">
        <li>Your domain ({domainInfo}) is not authorized in Vapi</li>
        <li>Microphone permission is not granted</li>
        <li>Your Vapi token or workflow ID is invalid</li>
        <li>There's a temporary issue with Vapi's API</li>
      </ul>
      
      <div className="flex flex-col sm:flex-row gap-3 mt-4">
        <button
          onClick={checkDomainAuthorization}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Check Domain Authorization
        </button>
        
        <button
          onClick={checkMicrophonePermission}
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
        >
          Check Microphone Permission
        </button>
        
        {onRetry && (
          <button
            onClick={onRetry}
            className="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700"
          >
            Retry Connection
          </button>
        )}
      </div>
    </div>
  );
}
