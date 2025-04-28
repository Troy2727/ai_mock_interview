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

  // Use a ref to store the Vapi instance to avoid recreating it on every render
  const vapiRef = useRef(getVapiInstance({
    onError: (error) => {
      console.error('Vapi error:', error);
      setErrorMessage(`Audio error: ${error.message}`);
      toast.error(`Audio error: ${error.message}`);
      setShowAudioTroubleshooter(true);
    },
    onConnectionLost: (error) => {
      console.warn('Connection lost:', error);
      setErrorMessage('Connection lost. Attempting to reconnect...');
      toast.warning('Connection lost. Attempting to reconnect...');
    },
    onReconnectSuccess: () => {
      console.log('Reconnected successfully');
      setErrorMessage(null);
      toast.success('Reconnected successfully!');
    },
    onReconnectFailed: (error) => {
      console.error('Failed to reconnect:', error);
      setErrorMessage(`Failed to reconnect: ${error?.message || 'Unknown error'}`);
      toast.error('Failed to reconnect. Please try again.');
      setCallStatus(CallStatus.FINISHED);
    },
    onEjection: (error) => {
      console.warn('Meeting ejection detected:', error);
      setErrorMessage('Meeting ended unexpectedly. Attempting to reconnect...');
      toast.warning('Meeting ended unexpectedly. Attempting to reconnect...');
    }
  }));

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

    // Set up Vapi event listeners
    useEffect(() => {
      const vapi = vapiRef.current;

      const onCallStart = () => {
        setCallStatus(CallStatus.ACTIVE);
        setErrorMessage(null);
      };

      const onCallEnd = () => setCallStatus(CallStatus.FINISHED);

      const onMessage = (message: Message) => {
        if(message.type === 'transcript' && message.transcriptType === 'final'){
          const newMessage = { role: message.role, content: message.transcript}
          setMessages((prev) => [...prev, newMessage]);
        }
      };

      const onSpeechStart = () => setIsSpeaking(true);
      const onSpeechEnd = () => setIsSpeaking(false);

      // Register event listeners
      vapi.on('call-start', onCallStart);
      vapi.on('call-end', onCallEnd);
      vapi.on('message', onMessage);
      vapi.on('speech-start', onSpeechStart);
      vapi.on('speech-end', onSpeechEnd);

      // Clean up event listeners when component unmounts
      return () => {
        vapi.off('call-start', onCallStart);
        vapi.off('call-end', onCallEnd);
        vapi.off('message', onMessage);
        vapi.off('speech-start', onSpeechStart);
        vapi.off('speech-end', onSpeechEnd);
      };
    }, []);

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
        console.log('Vapi token available:', !!process.env.NEXT_PUBLIC_VAPI_WEB_TOKEN);
        console.log('Vapi workflow ID:', process.env.NEXT_PUBLIC_VAPI_WORKFLOW_ID);

        // Validate Vapi configuration
        if (!process.env.NEXT_PUBLIC_VAPI_WEB_TOKEN) {
          toast.error('Vapi Web Token is missing. Please check your environment variables.');
          throw new Error('Vapi Web Token is missing. Please check your environment variables.');
        }

        if (!process.env.NEXT_PUBLIC_VAPI_WORKFLOW_ID) {
          toast.error('Vapi Workflow ID is missing. Please check your environment variables.');
          throw new Error('Vapi Workflow ID is missing. Please check your environment variables.');
        }

        // Clean up any existing Vapi instance
        resetVapiInstance();

        // Save call configuration for potential reconnection
        const callConfig = {
          workflowId: process.env.NEXT_PUBLIC_VAPI_WORKFLOW_ID,
          variableValues: {
            username: userName || 'User',
            userid: userId || 'anonymous',
          }
        };
        console.log('Call config:', callConfig);
        saveCallConfig(callConfig);

        // Start the call with enhanced connection handling
        console.log('Starting enhanced call...');

        // Based on Vapi documentation, we need to:
        // 1. Create a new Vapi instance
        // 2. Set up event handlers
        // 3. Start the call

        // Use our wrapper to get a Vapi instance (which will use the mock in development)
        try {
          // Log the current domain for debugging
          console.log('Current domain:', window.location.hostname);

          // Get a Vapi instance from our wrapper
          console.log('Getting Vapi instance from wrapper...');
          const vapiInstance = getVapiInstance({
            onError: (error) => {
              console.error('Vapi error:', error);
              setErrorMessage(`Audio error: ${error.message}`);
            },
            onConnectionLost: () => {
              console.warn('Connection lost');
              setErrorMessage('Connection lost. Attempting to reconnect...');
            },
            onReconnectSuccess: () => {
              console.log('Reconnected successfully');
              setErrorMessage(null);
            },
            onEjection: () => {
              console.warn('Meeting ejection detected');
              setErrorMessage('Meeting ended unexpectedly.');
            }
          });
          console.log('Vapi instance obtained successfully');

          // Set up event handlers with improved error handling
          vapiInstance.on('error', (error: any) => {
            console.error('Vapi error:', error);

            // Log detailed error information
            console.log('Error details:', {
              message: error?.message || 'Unknown error',
              name: error?.name,
              code: error?.code,
              stack: error?.stack,
              toString: String(error)
            });

            // Check for specific error types
            const errorStr = String(error);

            if (errorStr.includes('unauthorized') || errorStr.includes('domain')) {
              const domainError = `Domain authorization error: Please add ${window.location.hostname} to your Vapi authorized domains`;
              console.error(domainError);
              setErrorMessage(domainError);
              toast.error(domainError);
              return;
            }

            if (errorStr.includes('microphone') || errorStr.includes('audio') || errorStr.includes('permission')) {
              const micError = 'Microphone access is required. Please grant microphone permissions.';
              console.error(micError);
              setErrorMessage(micError);
              setShowAudioTroubleshooter(true);
              toast.error(micError);
              return;
            }

            // Default error message
            setErrorMessage(`Audio error: ${error instanceof Error ? error.message : String(error)}`);
          });

          vapiInstance.on('call-start', () => {
            console.log('Call started');
            setCallStatus(CallStatus.ACTIVE);
            toast.success('Interview started successfully');
          });

          vapiInstance.on('call-end', () => {
            console.log('Call ended');
            setCallStatus(CallStatus.INACTIVE);
          });

          // Store the instance globally before starting the call
          console.log('Storing Vapi instance globally');
          (window as any).__VAPI_INSTANCE__ = vapiInstance;

          // Add a marker to the DOM to indicate Vapi is initialized
          // This helps the EjectionErrorHandler distinguish between initialization errors and real errors
          const marker = document.createElement('div');
          marker.style.display = 'none';
          marker.setAttribute('data-vapi-initialized', 'true');
          document.body.appendChild(marker);

          // Start the call with better error handling
          console.log('Starting Vapi call...');
          try {
            // Make sure we have a valid workflow ID
            const workflowId = process.env.NEXT_PUBLIC_VAPI_WORKFLOW_ID;
            if (!workflowId) {
              throw new Error('Missing workflow ID');
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

            console.log('Using variable values:', variableValues);

            // Start the call with the workflow ID as a string and the variable values
            const result = await vapiInstance.start(workflowIdStr, {
              variableValues: variableValues
            });

            console.log('Call started with result:', result);
          } catch (startError) {
            console.error('Error starting Vapi call:', startError);

            // Check for specific error types
            const errorStr = String(startError);

            if (errorStr.includes('unauthorized') || errorStr.includes('domain')) {
              throw new Error(`Domain authorization error: Please add ${window.location.hostname} to your Vapi authorized domains`);
            }

            if (errorStr.includes('microphone') || errorStr.includes('audio') || errorStr.includes('permission')) {
              setShowAudioTroubleshooter(true);
              throw new Error('Microphone access is required. Please grant microphone permissions and try again.');
            }

            // Check for 404 errors which might indicate URL construction issues
            if (errorStr.includes('404') || errorStr.includes('Not Found')) {
              throw new Error('API endpoint not found. This might be due to an incorrect workflow ID or API configuration.');
            }

            // Re-throw with more context
            throw new Error(`Failed to start Vapi call: ${startError instanceof Error ? startError.message : String(startError)}`);
          }
        } catch (error) {
          console.error('Error with direct Vapi integration:', error);

          // Fall back to our wrapper
          console.log('Falling back to enhanced call wrapper...');

          // Make sure we have a valid workflow ID
          const workflowId = process.env.NEXT_PUBLIC_VAPI_WORKFLOW_ID;
          if (!workflowId) {
            throw new Error('Missing workflow ID in fallback method');
          }

          console.log('Using workflow ID in fallback:', workflowId);

          // Make sure to use the workflow ID as a string
          const workflowIdStr = String(workflowId);
          console.log('Using workflow ID as string in fallback:', workflowIdStr);

          // Create variable values object
          const variableValues = {
            username: userName || 'User',
            userid: userId || 'anonymous',
          };

          console.log('Using variable values in fallback:', variableValues);

          // Use the string workflow ID directly
          await startEnhancedCall(
            workflowIdStr,
            {
              variableValues: variableValues
            }
          );
        }

        console.log('Call initialization completed');
      } catch (error) {
        console.error('Failed to start call:', error);

        // Reset the Vapi instance to clean up
        try {
          resetVapiInstance();
        } catch (resetError) {
          console.warn('Error resetting Vapi instance:', resetError);
        }

        // Check for specific error types
        const errorStr = String(error);
        let errorMessage = `Failed to start interview: ${error instanceof Error ? error.message : 'Unknown error'}`;
        let shouldRedirect = true;

        if (errorStr.includes('unauthorized') || errorStr.includes('domain')) {
          errorMessage = `Domain authorization error: Please add ${window.location.hostname} to your Vapi authorized domains list in the Vapi dashboard.`;
          // Don't redirect for domain errors - let the user see the message
          shouldRedirect = false;
        } else if (errorStr.includes('microphone') || errorStr.includes('audio') || errorStr.includes('permission')) {
          errorMessage = 'Microphone access is required for the interview. Please grant microphone permissions and try again.';
          // Don't redirect for permission errors - let the user fix it
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
        await vapiRef.current.stop();
        console.log('Vapi instance stopped successfully');

        // Also reset the Vapi instance to ensure complete cleanup
        try {
          console.log('Resetting Vapi instance...');
          resetVapiInstance();
          console.log('Vapi instance reset successfully');
        } catch (resetError) {
          console.warn('Error resetting Vapi instance:', resetError);
        }

        // Clear any messages that might be in progress
        setIsSpeaking(false);
      } catch (error) {
        console.error('Error stopping call:', error);
        // Force the call to be considered finished even if there was an error
        setCallStatus(CallStatus.FINISHED);
        setIsSpeaking(false);

        // Try to reset the Vapi instance as a last resort
        try {
          resetVapiInstance();
        } catch (resetError) {
          console.warn('Error resetting Vapi instance during error recovery:', resetError);
        }
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