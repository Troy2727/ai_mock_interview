'use client';

import { cn } from '@/lib/utils';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import React, { useEffect, useState, useRef } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import Loading from './Loading';
import UserAvatar from './UserAvatar';

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

interface AgentProps {
  userName: string;
  userId?: string;
  type: "generate" | "interview";
}

const SimpleVapiAgent = ({userName, userId, type}: AgentProps) => {
  const router = useRouter();
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [callStatus, setCallStatus] = useState<CallStatus>(CallStatus.INACTIVE);
  const [messages, setMessages] = useState<SavedMessage[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Reference to store the Vapi instance
  const vapiRef = useRef<any>(null);

  // Initialize Vapi when the component mounts
  useEffect(() => {
    const initVapi = async () => {
      try {
        // Dynamically import the Vapi SDK
        const { default: Vapi } = await import('@vapi-ai/web');

        // Use the token from environment variables
        const token = process.env.NEXT_PUBLIC_VAPI_WEB_TOKEN || "29470ff4-913a-4394-bff5-0d0e2828cb68";

        console.log('Creating Vapi instance with token:', token.substring(0, 5) + '...');

        // Create a new Vapi instance with the token
        const vapiInstance = new Vapi(token);

        // Set up event handlers
        vapiInstance.on('error', (error: any) => {
          console.error('Vapi error:', error);
          const errorMsg = error instanceof Error ? error.message : String(error);

          // Check if this is an ejection error
          if (errorMsg.includes('meeting ended') || errorMsg.includes('ejection')) {
            console.log('Detected ejection error in error handler');
            setCallStatus(CallStatus.FINISHED);
            setErrorMessage('The interview was ended by the system. Please try again later.');
            toast.error('The interview was ended by the system. Please try again later.');
          } else {
            // Handle other errors
            setErrorMessage(`Audio error: ${errorMsg}`);
            toast.error(`Audio error: ${errorMsg}`);
          }
        });

        vapiInstance.on('call-start', () => {
          console.log('Call started');
          setCallStatus(CallStatus.ACTIVE);
          setErrorMessage(null);
          toast.success('Call started successfully');
        });

        vapiInstance.on('call-end', () => {
          console.log('Call ended');

          // Check if this was a normal end or an ejection
          if (errorMessage && (errorMessage.includes('meeting ended') || errorMessage.includes('ejection'))) {
            console.log('Call ended due to ejection');
          } else {
            console.log('Call ended normally');
            setCallStatus(CallStatus.FINISHED);
            toast.info('Call ended');
          }
        });

        // Add an ejection handler
        vapiInstance.on('ejection', (error: any) => {
          console.log('Ejection event received:', error);
          setCallStatus(CallStatus.FINISHED);
          setErrorMessage('The interview was ended by the system. Please try again later.');
          toast.error('The interview was ended by the system. Please try again later.');
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
          if (message.type === 'transcript' && message.transcriptType === 'final') {
            const newMessage = {
              role: message.role,
              content: message.transcript || ''
            };
            setMessages(prev => [...prev, newMessage]);
          }
        });

        // Store the Vapi instance in the ref
        vapiRef.current = vapiInstance;
        console.log('Vapi instance created successfully');
      } catch (error) {
        console.error('Error initializing Vapi:', error);
        const errorMsg = error instanceof Error ? error.message : String(error);
        setErrorMessage(`Error initializing Vapi: ${errorMsg}`);
        toast.error(`Error initializing Vapi: ${errorMsg}`);
      }
    };

    initVapi();

    // Clean up when component unmounts
    return () => {
      if (vapiRef.current) {
        try {
          vapiRef.current.stop();
        } catch (error) {
          console.warn('Error stopping Vapi instance during cleanup:', error);
        }
      }
    };
  }, []);

  // Handle call status changes
  useEffect(() => {
    if (callStatus === CallStatus.FINISHED) {
      setIsRedirecting(true);

      // Redirect to dashboard after a delay
      const timer = setTimeout(() => {
        router.push('/dashboard');
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [callStatus, router]);

  // We've simplified the microphone permission handling

  // Add a state to track retry attempts
  const [retryCount, setRetryCount] = useState(0);
  const MAX_RETRIES = 3;

  const handleCall = async () => {
    try {
      console.log('Starting interview...');
      toast.info('Starting interview...');

      // Check if we have a Vapi instance
      if (!vapiRef.current) {
        // Try to reinitialize Vapi
        try {
          console.log('Reinitializing Vapi...');
          const { default: Vapi } = await import('@vapi-ai/web');
          const token = process.env.NEXT_PUBLIC_VAPI_WEB_TOKEN || "29470ff4-913a-4394-bff5-0d0e2828cb68";
          vapiRef.current = new Vapi(token);
          console.log('Vapi reinitialized successfully');
        } catch (error) {
          const errorMsg = 'Vapi is not initialized yet. Please wait a moment and try again.';
          console.error(errorMsg, error);
          toast.error(errorMsg);
          return;
        }
      }

      // Simple microphone permission check
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        // Stop the stream immediately after getting permission
        stream.getTracks().forEach(track => track.stop());
      } catch (error) {
        console.warn('Microphone permission not granted:', error);
        toast.warning('Microphone access is recommended for the interview. The interview will continue, but you may experience audio issues.');
      }

      // Update UI
      setErrorMessage(null);
      setCallStatus(CallStatus.CONNECTING);

      console.log('Starting call with your custom workflow...');

      // Use the exact workflow ID from your Vapi dashboard
      const workflowId = "jrmaestro_interview_prep";

      // Create variable values to pass to the workflow
      const variableValues = {
        name: userName || 'User',
        username: userName || 'User',
        userid: userId || 'anonymous'
      };

      // Create options with assistantOverrides
      const options = {
        assistantOverrides: {
          variableValues: variableValues
        }
      };

      console.log('Using workflow ID:', workflowId);
      console.log('With options:', JSON.stringify(options));

      // Try with the workflow ID and options
      try {
        console.log('Starting call with workflow...');
        await vapiRef.current.start(workflowId, options);
        console.log('Call started successfully');

        // Reset retry count on success
        setRetryCount(0);
      } catch (workflowError) {
        console.error('Error starting call with workflow and options:', workflowError);

        try {
          // Try just the workflow ID without options
          console.log('Trying just the workflow ID...');
          await vapiRef.current.start(workflowId);
          console.log('Call started successfully with just workflow ID');
          setRetryCount(0);
        } catch (workflowIdError) {
          console.error('Error with just workflow ID:', workflowIdError);

          // Check if we should retry
          if (retryCount < MAX_RETRIES) {
            const newRetryCount = retryCount + 1;
            setRetryCount(newRetryCount);

            console.log(`Retry attempt ${newRetryCount}/${MAX_RETRIES}...`);
            toast.info(`Connection issue. Retrying... (${newRetryCount}/${MAX_RETRIES})`);

            // Wait a moment before retrying
            setTimeout(() => {
              handleCall();
            }, 2000);

            return;
          } else {
            // Max retries reached, show error
            throw workflowIdError;
          }
        }
      }
    } catch (error) {
      console.error('Error starting call:', error);

      // Create a detailed error message
      const errorMsg = error instanceof Error ? error.message : String(error);

      // Check for specific error types
      if (errorMsg.includes('unauthorized') || errorMsg.includes('domain')) {
        toast.error(`Domain authorization error: Your domain is not authorized. Please contact Vapi support.`);
        console.error('Domain authorization error. Make sure your domain is added to the allowed domains in your Vapi dashboard.');
      } else if (errorMsg.includes('microphone') || errorMsg.includes('audio') || errorMsg.includes('permission')) {
        toast.error('Microphone access is required for the interview. Please grant microphone permissions and try again.');
      } else if (errorMsg.includes('404') || errorMsg.includes('Not Found')) {
        toast.error('Workflow not found. Please check your workflow ID.');
        console.error('Workflow ID being used:', workflowId);
      } else if (errorMsg.includes('variable') || errorMsg.includes('variables')) {
        toast.error('Variable error: There was an issue with the variables passed to the workflow. Please check your workflow configuration.');
        console.error('Variable values that were passed:', {
          name: userName || 'User',
          username: userName || 'User',
          userid: userId || 'anonymous'
        });
        console.error('Make sure your workflow is using {{name}} or {{username}} format for variables');
      } else if (errorMsg.includes('{}') || errorMsg === '{}' || errorMsg === 'Error: {}') {
        toast.error('Empty error response. This is likely a domain authorization issue. Make sure your domain is added to the allowed domains in your Vapi dashboard.');
        console.error('Empty error response. This is commonly caused by:');
        console.error('1. Domain not being authorized in Vapi dashboard');
        console.error('2. Invalid Vapi token');
        console.error('3. Network issues');
        console.error('Current domain:', window.location.hostname);
        console.error('Vapi token being used:', process.env.NEXT_PUBLIC_VAPI_WEB_TOKEN?.substring(0, 5) + '...');
      } else if (errorMsg.includes('ejection')) {
        toast.error('The call was ejected. This might be due to a domain authorization issue or an invalid token.');
        console.error('Ejection error. This is commonly caused by:');
        console.error('1. Domain not being authorized in Vapi dashboard');
        console.error('2. Invalid Vapi token');
        console.error('Current domain:', window.location.hostname);
      } else {
        toast.error(`Error starting call: ${errorMsg}`);
      }

      // Update UI
      setErrorMessage(errorMsg);
      setCallStatus(CallStatus.INACTIVE);
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

      // Clear any messages that might be in progress
      setIsSpeaking(false);
    } catch (error) {
      console.error('Error stopping call:', error);
      // Force the call to be considered finished even if there was an error
      setCallStatus(CallStatus.FINISHED);
      setIsSpeaking(false);
    }
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

      {messages.length > 0 && (
        <div className='transcript-border'>
          <div className='transcript'>
            <p key={latestMessage} className={cn('transition-opacity duration-500 opacity-0', 'animate-fadeIn opacity-100')}>{latestMessage}</p>
          </div>
        </div>
      )}

      <div className='w-full flex justify-center'>
        {callStatus !== CallStatus.ACTIVE ? (
          <button
            className='relative btn-call'
            onClick={handleCall}
            disabled={callStatus === CallStatus.CONNECTING}
          >
            <span className={cn('absolute animate-ping rounded-full opacity-75', callStatus !== CallStatus.CONNECTING && 'hidden')} />
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

      {errorMessage && (
        <div className='mt-4 p-4 bg-red-100 rounded-lg'>
          <h3 className='text-lg font-bold text-red-800 mb-2'>Error</h3>
          <p className='text-red-800'>{errorMessage}</p>

          <div className='mt-4'>
            <h4 className='font-bold text-red-800 mb-1'>Troubleshooting Tips:</h4>
            <ul className='list-disc pl-5 text-red-800'>
              <li>Make sure your microphone is working properly</li>
              <li>Check that you've granted microphone permissions in your browser</li>
              <li>Try using a different browser (Chrome is recommended)</li>
              <li>Try refreshing the page</li>
              <li>Check your internet connection</li>
            </ul>


          </div>
        </div>
      )}


    </>
  );
};

export default SimpleVapiAgent;
