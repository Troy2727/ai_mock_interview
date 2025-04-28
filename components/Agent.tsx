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
        resetVapiInstance();
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
        setIsRedirecting(true); // Trigger loader before navigation
        router.push('/dashboard');
      }
    }, [callStatus, router]);

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

        // Create a new Vapi instance directly (not using our wrapper)
        try {
          // Import Vapi dynamically to ensure it's loaded in the browser
          const Vapi = (await import('@vapi-ai/web')).default;
          const vapiInstance = new Vapi(process.env.NEXT_PUBLIC_VAPI_WEB_TOKEN);

          // Set up event handlers
          vapiInstance.on('error', (error: any) => {
            console.error('Vapi error:', error);
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

          // Start the call
          const result = await vapiInstance.start(process.env.NEXT_PUBLIC_VAPI_WORKFLOW_ID, {
            variableValues: {
              username: userName || 'User',
              userid: userId || 'anonymous',
            }
          });

          console.log('Call started with result:', result);

          // Store the instance globally
          (window as any).__VAPI_INSTANCE__ = vapiInstance;
        } catch (error) {
          console.error('Error with direct Vapi integration:', error);

          // Fall back to our wrapper
          console.log('Falling back to enhanced call wrapper...');
          await startEnhancedCall(
            process.env.NEXT_PUBLIC_VAPI_WORKFLOW_ID,
            {
              variableValues: {
                username: userName || 'User',
                userid: userId || 'anonymous',
              }
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

        // Update UI
        setErrorMessage(`Failed to start interview: ${error instanceof Error ? error.message : 'Unknown error'}`);
        setCallStatus(CallStatus.INACTIVE);
        setShowAudioTroubleshooter(true);

        // Show a user-friendly error message
        toast.error('Failed to start the interview. Please try again later.');

        // Redirect to dashboard after a delay
        setTimeout(() => {
          router.push('/dashboard');
        }, 3000);
      }
    };

    const handleDisconnect = async () => {
      try {
        setCallStatus(CallStatus.FINISHED);
        vapiRef.current.stop();
      } catch (error) {
        console.error('Error stopping call:', error);
        // Force the call to be considered finished even if there was an error
        setCallStatus(CallStatus.FINISHED);
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