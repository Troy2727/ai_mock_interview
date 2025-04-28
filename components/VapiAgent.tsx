'use client';

import { cn } from '@/lib/utils';
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

interface Message {
  type: string;
  transcriptType?: string;
  role: 'user' | 'system' | 'assistant';
  transcript?: string;
}

interface AgentProps {
  userName: string;
  userId?: string;
  type: "generate" | "interview";
}

const VapiAgent = ({userName, userId, type}: AgentProps) => {
  const router = useRouter();
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [callStatus, setCallStatus] = useState<CallStatus>(CallStatus.INACTIVE);
  const [messages, setMessages] = useState<SavedMessage[]>([]);
  const [hasMicPermission, setHasMicPermission] = useState<boolean | null>(null);
  const [showAudioTroubleshooter, setShowAudioTroubleshooter] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Reference to store the Vapi instance
  const vapiRef = useRef<any>(null);

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

    // Clean up when component unmounts
    return () => {
      // Stop the call if it's active
      if (vapiRef.current) {
        try {
          vapiRef.current.stop();
        } catch (error) {
          console.warn('Error stopping Vapi instance during cleanup:', error);
        }
      }
    };
  }, []);

  // Initialize Vapi when the component mounts
  useEffect(() => {
    const initVapi = async () => {
      try {
        // Dynamically import the Vapi SDK
        const VapiModule = await import('@vapi-ai/web');
        const Vapi = VapiModule.default;

        // Get the token from environment variables
        const token = process.env.NEXT_PUBLIC_VAPI_WEB_TOKEN;

        if (!token) {
          console.error('Vapi token is missing');
          toast.error('Vapi token is missing. Please check your environment variables.');
          return;
        }

        console.log('Creating Vapi instance with token:', token.substring(0, 5) + '...');

        // Create a new Vapi instance
        const vapiInstance = new Vapi(token);

        // Set up event handlers
        vapiInstance.on('error', (error: any) => {
          console.error('Vapi error:', error);
          const errorMsg = error instanceof Error ? error.message : String(error);
          setErrorMessage(`Audio error: ${errorMsg}`);
          toast.error(`Audio error: ${errorMsg}`);
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

        vapiInstance.on('message', (message: Message) => {
          console.log('Message received:', message);
          if (message.type === 'transcript' && message.transcriptType === 'final') {
            const newMessage = {
              role: message.role,
              content: message.transcript || ''
            };
            setMessages((prev) => [...prev, newMessage]);
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
  }, []);

  // Handle call status changes
  useEffect(() => {
    if (callStatus === CallStatus.FINISHED) {
      // Reset the call status to inactive
      setCallStatus(CallStatus.INACTIVE);
    }
  }, [callStatus]);

  const handleCall = async () => {
    try {
      console.log('Starting interview...');
      toast.info('Starting interview...');

      // Check if we have a Vapi instance
      if (!vapiRef.current) {
        const errorMsg = 'Vapi is not initialized yet. Please wait a moment and try again.';
        console.error(errorMsg);
        toast.error(errorMsg);
        return;
      }

      // Check microphone permission
      const hasPermission = await checkMicrophonePermission();
      console.log('Microphone permission:', hasPermission);

      if (!hasPermission) {
        setShowAudioTroubleshooter(true);
        toast.error('Microphone access is required for the interview');
        return;
      }

      // Update UI
      setErrorMessage(null);
      setCallStatus(CallStatus.CONNECTING);

      // Use the workflow ID directly as a string
      console.log('Using workflow ID directly');

      // Get the workflow ID from environment variables
      const workflowId = process.env.NEXT_PUBLIC_VAPI_WORKFLOW_ID;

      if (!workflowId) {
        const errorMsg = 'Workflow ID is missing. Please check your environment variables.';
        console.error(errorMsg);
        toast.error(errorMsg);
        throw new Error(errorMsg);
      }

      // Create variable values
      const variableValues = {
        username: userName || 'User',
        userid: userId || 'anonymous',
      };

      console.log('Using workflow ID:', workflowId);
      console.log('Using variable values:', JSON.stringify(variableValues));

      // Start the call with the workflow ID as a string
      console.log('Starting call with workflow ID');

      try {
        // Try a different approach with a simple assistant configuration
        console.log('Starting call with simple assistant configuration');
        const result = await vapiRef.current.start({
          firstMessage: `Hello ${userName}, I'm Connor, your interview architect. How can I help you today?`,
          model: {
            provider: "openai",
            model: "gpt-3.5-turbo",
            systemPrompt: `You are Connor, an AI interview architect. Your job is to help ${userName} prepare for job interviews by asking relevant questions and providing feedback.`
          }
        });

        console.log('Call started with result:', result);
        toast.success('Call started successfully!');
      } catch (startError) {
        console.error('Error starting call:', startError);
        const errorMsg = startError instanceof Error ? startError.message : String(startError);
        throw new Error(`Failed to start call: ${errorMsg}`);
      }
    } catch (error) {
      console.error('Failed to start call:', error);

      // Check for specific error types
      const errorStr = String(error);
      let errorMessage = `Failed to start interview: ${error instanceof Error ? error.message : 'Unknown error'}`;

      if (errorStr.includes('unauthorized') || errorStr.includes('domain')) {
        errorMessage = `Domain authorization error: Please add ${window.location.hostname} to your Vapi authorized domains list.`;
      } else if (errorStr.includes('microphone') || errorStr.includes('audio') || errorStr.includes('permission')) {
        errorMessage = 'Microphone access is required for the interview. Please grant microphone permissions and try again.';
      } else if (errorStr.includes('{}') || errorStr === '{}') {
        errorMessage = 'An empty error occurred. This might be due to a domain authorization issue or an invalid workflow ID.';
      }

      // Update UI
      setErrorMessage(errorMessage);
      setCallStatus(CallStatus.INACTIVE);
      setShowAudioTroubleshooter(true);

      // Show error message
      toast.error(errorMessage);
    }
  };

  const handleDisconnect = async () => {
    try {
      console.log('Disconnecting call...');

      // Update UI
      setCallStatus(CallStatus.FINISHED);

      // Check if we have a Vapi instance
      if (!vapiRef.current) {
        console.warn('No Vapi instance found when trying to disconnect');
        return;
      }

      // Stop the call
      try {
        await vapiRef.current.stop();
        console.log('Call stopped successfully');
      } catch (stopError) {
        console.error('Error stopping call:', stopError);
        const errorMsg = stopError instanceof Error ? stopError.message : String(stopError);
        toast.error(`Error stopping call: ${errorMsg}`);
      }

      // Clear UI state
      setIsSpeaking(false);
    } catch (error) {
      console.error('Error disconnecting call:', error);

      // Force the call to be considered finished
      setCallStatus(CallStatus.FINISHED);
      setIsSpeaking(false);

      // Show error message
      const errorMsg = error instanceof Error ? error.message : String(error);
      toast.error(`Error disconnecting call: ${errorMsg}`);
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

      {showAudioTroubleshooter && (
        <AudioTroubleshooter
          onPermissionGranted={handleAudioPermissionGranted}
          onDeviceSelected={(deviceId) => {
            console.log('Selected audio device:', deviceId);
            // We don't use this yet, but we could in the future
          }}
        />
      )}

      {errorMessage && (
        <div className='error-message'>
          <p>{errorMessage}</p>
        </div>
      )}
    </>
  );
};

export default VapiAgent;
