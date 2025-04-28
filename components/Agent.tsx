'use client';

import { cn } from '@/lib/utils';
import {
  getVapiInstance,
  resetVapiInstance,
  startEnhancedCall,
  saveCallConfig
} from '@/lib/vapi.sdk';
import { checkMicrophonePermission } from '@/lib/audio-utils';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import React, { useEffect, useState, useRef } from 'react';
import { toast } from 'sonner';
import Loading from './Loading';
import UserAvatar from './UserAvatar';
import AudioTroubleshooter from './AudioTroubleshooter';

enum CallStatus {
    INACTIVE = 'INACTIVE',
    CONNECTING = 'CONNECTING',
    ACTIVE = 'ACTIVE',
    FINISHED = 'FINISHED',
}

interface SavedMessage {
  role: 'user' | 'system' | 'assistant';
  content: string;
}
const Agent = ({userName, userId, type}: AgentProps) => {
  const router = useRouter();
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [callStatus, setCallStatus] = useState<CallStatus>(CallStatus.INACTIVE);
  const [messages, setMessages] = useState<SavedMessage[]>([]);
  const [hasMicPermission, setHasMicPermission] = useState<boolean | null>(null);
  const [showAudioTroubleshooter, setShowAudioTroubleshooter] = useState(false);
  const [selectedAudioDevice, setSelectedAudioDevice] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // State to store the JWT token
  const [vapiToken, setVapiToken] = useState<string | null>(null);

  // Use a ref to store the Vapi instance to avoid recreating it on every render
  const vapiRef = useRef<any>(null);

  // Fetch the JWT token from our API endpoint
  useEffect(() => {
    const fetchToken = async () => {
      try {
        const response = await fetch('/api/vapi-token');
        const data = await response.json();

        if (data.error) {
          console.error('Error fetching Vapi token:', data.error);
          toast.error(`Error fetching Vapi token: ${data.message}`);
          return;
        }

        setVapiToken(data.token);
        console.log('Vapi token fetched successfully');
      } catch (error) {
        console.error('Error fetching Vapi token:', error);
        toast.error(`Error fetching Vapi token: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    };

    fetchToken();
  }, []);

  // Initialize Vapi instance when token is available
  useEffect(() => {
    if (!vapiToken) return;

    console.log('Initializing Vapi instance with token');

    try {
      // Import the Vapi SDK directly
      import('@vapi-ai/web').then(VapiModule => {
        try {
          console.log('Vapi SDK imported successfully');

          // Create a new Vapi instance directly
          const Vapi = VapiModule.default;
          console.log('Creating Vapi instance with token');

          // Create the Vapi instance
          const vapiInstance = new Vapi(vapiToken);
          console.log('Vapi instance created successfully');

          // Set up event handlers
          vapiInstance.on('error', (error: any) => {
            console.error('Vapi error:', error);
            setErrorMessage(`Audio error: ${error instanceof Error ? error.message : String(error)}`);
            toast.error(`Audio error: ${error instanceof Error ? error.message : String(error)}`);
            setShowAudioTroubleshooter(true);
          });

          vapiInstance.on('call-start', () => {
            console.log('Call started');
            setCallStatus(CallStatus.ACTIVE);
            setErrorMessage(null);
            toast.success('Call started successfully');
          });

          vapiInstance.on('call-end', () => {
            console.log('Call ended');
            setCallStatus(CallStatus.INACTIVE);
          });

          vapiInstance.on('speech-start', () => {
            console.log('Speech started');
            setIsSpeaking(true);
          });

          vapiInstance.on('speech-end', () => {
            console.log('Speech ended');
            setIsSpeaking(false);
          });

          vapiInstance.on('message', (message: any) => {
            console.log('Message received:', message);
            if(message.type === 'transcript' && message.transcriptType === 'final'){
              const newMessage = { role: message.role, content: message.transcript}
              setMessages((prev) => [...prev, newMessage]);
            }
          });

          // Store the Vapi instance in the ref
          vapiRef.current = vapiInstance;
          console.log('Vapi instance stored in ref');
        } catch (error) {
          console.error('Error creating Vapi instance:', error);
          toast.error(`Error creating Vapi instance: ${error instanceof Error ? error.message : String(error)}`);
        }
      }).catch(error => {
        console.error('Error importing Vapi SDK:', error);
        toast.error(`Error importing Vapi SDK: ${error instanceof Error ? error.message : String(error)}`);
      });
    } catch (error) {
      console.error('Error in Vapi initialization:', error);
      toast.error(`Error in Vapi initialization: ${error instanceof Error ? error.message : String(error)}`);
    }
  }, [vapiToken]);

    // Check microphone permission on component mount
    useEffect(() => {
      const checkMicPermission = async () => {
        const hasPermission = await checkMicrophonePermission();
        setHasMicPermission(hasPermission);

        if (!hasPermission) {
          setShowAudioTroubleshooter(true);
        }
      };

      checkMicPermission();

      // Clean up Vapi instance when component unmounts
      return () => {
        // Reset Vapi instance
        resetVapiInstance();

        // Remove the Vapi initialization marker
        const marker = document.querySelector('[data-vapi-initialized="true"]');
        if (marker && marker.parentNode) {
          marker.parentNode.removeChild(marker);
        }
      };
    }, []);

    // We don't need this effect anymore since we're setting up event listeners
    // when we create the Vapi instance in the previous useEffect
    // This avoids duplicate event listeners

    // Handle call status changes
    useEffect(() => {
      if(callStatus === CallStatus.FINISHED) {
        // Instead of redirecting to dashboard, just reset the call status
        // This allows the user to restart the interview from where they left off
        console.log('Call finished, resetting call status to INACTIVE');
        setCallStatus(CallStatus.INACTIVE);
      }
    }, [callStatus]);

    const handleCall = async () => {
      try {
        console.log('Starting interview generation...');
        toast.info('Starting interview generation...');

        // Check if we have a Vapi instance
        if (!vapiRef.current) {
          const errorMsg = 'Vapi is not initialized yet. Please wait a moment and try again.';
          console.error(errorMsg);
          toast.error(errorMsg);
          return;
        }

        // Check microphone permission before starting the call
        const hasPermission = await checkMicrophonePermission();
        console.log('Microphone permission:', hasPermission);

        if (!hasPermission) {
          setShowAudioTroubleshooter(true);
          toast.error('Microphone access is required for the interview');
          return;
        }

        setErrorMessage(null);
        setCallStatus(CallStatus.CONNECTING);

        // Log Vapi configuration
        console.log('Vapi token available:', !!vapiToken);
        console.log('Vapi workflow ID:', process.env.NEXT_PUBLIC_VAPI_WORKFLOW_ID);

        // Validate Vapi configuration
        if (!vapiToken) {
          const errorMsg = 'Vapi token is not available. Please wait a moment and try again.';
          console.error(errorMsg);
          toast.error(errorMsg);
          throw new Error(errorMsg);
        }

        if (!process.env.NEXT_PUBLIC_VAPI_WORKFLOW_ID) {
          const errorMsg = 'Vapi Workflow ID is missing. Please check your environment variables.';
          console.error(errorMsg);
          toast.error(errorMsg);
          throw new Error(errorMsg);
        }

        // Make sure we have a valid workflow ID
        const workflowId = process.env.NEXT_PUBLIC_VAPI_WORKFLOW_ID;
        if (!workflowId) {
          const errorMsg = 'Missing workflow ID';
          console.error(errorMsg);
          toast.error(errorMsg);
          throw new Error(errorMsg);
        }

        console.log('Using workflow ID:', workflowId);

        // Use the workflow ID directly as a string
        const workflowIdStr = String(workflowId);
        console.log('Using workflow ID as string:', workflowIdStr);

        // Create variable values object
        const variableValues = {
          username: userName || 'User',
          userid: userId || 'anonymous',
        };

        console.log('Using variable values:', JSON.stringify(variableValues));

        // Create call options
        const callOptions = {
          variableValues: variableValues
        };

        console.log('Call options:', JSON.stringify(callOptions));

        // Start the call with the workflow ID as a string and the variable values
        console.log('Starting Vapi call with vapiRef.current.start...');

        try {
          // Log the Vapi instance type
          console.log('Vapi instance type:', vapiRef.current ? typeof vapiRef.current : 'undefined');
          console.log('Vapi instance methods:', vapiRef.current ? Object.keys(vapiRef.current) : 'undefined');

          // Start the call
          const result = await vapiRef.current.start(workflowIdStr, callOptions);
          console.log('Call started with result:', result);
          console.log('Call initialization completed');

          // Show success message
          toast.success('Call started successfully!');
        } catch (startError) {
          console.error('Error starting Vapi call:', startError);

          // Create a more detailed error message
          const errorMessage = startError instanceof Error
            ? startError.message
            : (typeof startError === 'string' ? startError : 'Unknown error');

          console.error('Error details:', {
            message: errorMessage,
            workflowId: workflowIdStr,
            options: JSON.stringify(callOptions)
          });

          throw new Error(`Failed to start Vapi call: ${errorMessage}`);
        }
      } catch (error) {
        console.error('Failed to start call:', error);

        // Check for specific error types
        const errorStr = String(error);
        let errorMessage = `Failed to start interview: ${error instanceof Error ? error.message : 'Unknown error'}`;
        let shouldRedirect = true;

        if (errorStr.includes('unauthorized') || errorStr.includes('domain')) {
          errorMessage = `Domain authorization error: Please check your Vapi token configuration.`;
          // Don't redirect for domain errors - let the user see the message
          shouldRedirect = false;
        } else if (errorStr.includes('microphone') || errorStr.includes('audio') || errorStr.includes('permission')) {
          errorMessage = 'Microphone access is required for the interview. Please grant microphone permissions and try again.';
          // Don't redirect for permission errors - let the user fix it
          shouldRedirect = false;
        } else if (errorStr.includes('{}') || errorStr === '{}') {
          errorMessage = 'An empty error occurred. This might be due to a domain authorization issue or an invalid workflow ID.';
          shouldRedirect = false;
        }

        // Update UI
        setErrorMessage(errorMessage);
        setCallStatus(CallStatus.INACTIVE);
        setShowAudioTroubleshooter(true);

        // Show a user-friendly error message
        toast.error(errorMessage);

        // Only redirect for certain errors
        if (shouldRedirect) {
          // Redirect to dashboard after a delay
          setTimeout(() => {
            router.push('/dashboard');
          }, 5000);
        }
      }
    };

    const handleDisconnect = async () => {
      try {
        console.log('Disconnecting call...');

        // First update the UI to show the call is finished
        setCallStatus(CallStatus.FINISHED);

        // Make sure we have a valid Vapi instance
        if (!vapiRef.current) {
          console.warn('No Vapi instance found when trying to disconnect');
          return;
        }

        // Stop the call
        console.log('Stopping Vapi instance...');
        try {
          await vapiRef.current.stop();
          console.log('Vapi instance stopped successfully');
        } catch (stopError) {
          console.error('Error stopping Vapi instance:', stopError);
          toast.error(`Error stopping call: ${stopError instanceof Error ? stopError.message : String(stopError)}`);
        }

        // Clear any messages that might be in progress
        setIsSpeaking(false);
      } catch (error) {
        console.error('Error stopping call:', error);
        // Force the call to be considered finished even if there was an error
        setCallStatus(CallStatus.FINISHED);
        setIsSpeaking(false);
        toast.error(`Error stopping call: ${error instanceof Error ? error.message : String(error)}`);
      }
    };

    const handleAudioPermissionGranted = () => {
      setHasMicPermission(true);
      setShowAudioTroubleshooter(false);
    };

    const latestMessage = messages[messages.length - 1]?.content;

    const isCallInactiveOrFinished = callStatus === CallStatus.INACTIVE || callStatus === CallStatus.FINISHED;

  return (
    <>
      <div className='call-view'>
        {isRedirecting && (
          <div>
            <Loading />
          </div>
        )}

        <div className='card-interviewer'>
          <div className='avatar'>
            <Image
              src="/Connor.webp"
              alt="connor"
              width={114}
              height={65}
              className='object-cover rounded-full'
            />
            {isSpeaking && <span className='animate-speak'/>}
          </div>
          <h3>Connor</h3>
          <h4>Interview Architect</h4>
        </div>

        <div className='card-border'>
          <div className='card-content'>
            <UserAvatar
              user={{ name: userName }}
              size={120}
              className="mx-auto"
            />
            <h3>{userName}</h3>
          </div>
        </div>
      </div>

      {/* Audio troubleshooter dialog */}
      {showAudioTroubleshooter && (
        <div className="mt-4 mb-4">
          <AudioTroubleshooter onPermissionGranted={handleAudioPermissionGranted} />

          {errorMessage && (
            <div className="mt-4 p-3 bg-red-900/30 border border-red-500 rounded-md text-red-200">
              <p className="font-medium">Error:</p>
              <p>{errorMessage}</p>
            </div>
          )}

          <div className="mt-4 flex justify-end">
            <button
              className="text-primary-100 underline"
              onClick={() => setShowAudioTroubleshooter(false)}
            >
              Hide Audio Settings
            </button>
          </div>
        </div>
      )}

      {/* Show audio settings button if not already showing */}
      {!showAudioTroubleshooter && callStatus === CallStatus.INACTIVE && (
        <div className="mt-2 mb-4 flex justify-center">
          <button
            className="text-primary-100 text-sm underline"
            onClick={() => setShowAudioTroubleshooter(true)}
          >
            Audio Settings
          </button>
        </div>
      )}

      {messages.length > 0 && (
        <div className='transcript-border'>
          <div className='transcript'>
            <p
              key={latestMessage}
              className={cn('transition-opacity duration-500 opacity-0', 'animate-fadeIn opacity-100')}
            >
              {latestMessage}
            </p>
          </div>
        </div>
      )}

      <div className='w-full flex justify-center'>
        {callStatus !== 'ACTIVE' ? (
          <button
            className='relative btn-call'
            onClick={handleCall}
            disabled={callStatus === CallStatus.CONNECTING || hasMicPermission === false}
          >
            <span
              className={cn('absolute animate-ping rounded-full opacity-75', callStatus !== 'CONNECTING' && 'hidden')}
            />
            <span>
              {isCallInactiveOrFinished ? 'Call' : '. . .'}
            </span>
          </button>
        ) : (
          <button className='btn-disconnect' onClick={handleDisconnect}>
            End
          </button>
        )}
      </div>

      {/* Audio permission warning */}
      {hasMicPermission === false && !showAudioTroubleshooter && (
        <div className="mt-4 text-center text-yellow-400">
          <p>Microphone access is required for the interview</p>
          <button
            className="underline mt-1"
            onClick={() => setShowAudioTroubleshooter(true)}
          >
            Grant Access
          </button>
        </div>
      )}
    </>
  )
}

export default Agent