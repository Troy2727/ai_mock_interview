'use client';

import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { checkMicrophonePermission, requestMicrophonePermission } from '@/lib/audio-utils';
import Image from 'next/image';

const TestWorkflow = () => {
  const [isCallActive, setIsCallActive] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [messages, setMessages] = useState<{role: string, content: string}[]>([]);
  const vapiRef = useRef<any>(null);
  const [hasMicPermission, setHasMicPermission] = useState<boolean | null>(null);

  // Check microphone permission on component mount
  useEffect(() => {
    const checkPermission = async () => {
      const permission = await checkMicrophonePermission();
      setHasMicPermission(permission);
    };

    checkPermission();
  }, []);

  // Initialize Vapi when the component mounts
  useEffect(() => {
    const initVapi = async () => {
      try {
        // Dynamically import the Vapi SDK
        const VapiModule = await import('@vapi-ai/web');
        const Vapi = VapiModule.default;

        // Use the token directly from your .env.local file
        const token = "29470ff4-913a-4394-bff5-0d0e2828cb68";

        console.log('Creating Vapi instance with token:', token.substring(0, 5) + '...');

        // Create a new Vapi instance with the token
        const vapiInstance = new Vapi(token);

        // Set up event handlers
        vapiInstance.on('error', (error: any) => {
          console.error('Vapi error:', error);
          const errorMsg = error instanceof Error ? error.message : String(error);
          toast.error(`Vapi error: ${errorMsg}`);
        });

        vapiInstance.on('call-start', () => {
          console.log('Call started');
          setIsCallActive(true);
          toast.success('Call started successfully');
        });

        vapiInstance.on('call-end', () => {
          console.log('Call ended');
          setIsCallActive(false);
          toast.info('Call ended');
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
            setTranscript(message.transcript || '');
          }
        });

        // Store the Vapi instance in the ref
        vapiRef.current = vapiInstance;
        console.log('Vapi instance created successfully');
      } catch (error) {
        console.error('Error initializing Vapi:', error);
        const errorMsg = error instanceof Error ? error.message : String(error);
        toast.error(`Error initializing Vapi: ${errorMsg}`);
      }
    };

    initVapi();

    // Clean up
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

  const handleRequestPermission = async () => {
    const granted = await requestMicrophonePermission();
    setHasMicPermission(granted);

    if (granted) {
      toast.success('Microphone access granted!');
    } else {
      toast.error('Microphone access denied. Please enable it in your browser settings.');
    }
  };

  const startCall = async () => {
    try {
      // Check if Vapi is initialized
      if (!vapiRef.current) {
        toast.error('Vapi is not initialized yet. Please wait a moment and try again.');
        return;
      }

      // Check microphone permission
      if (!hasMicPermission) {
        toast.error('Microphone access is required. Please grant permission first.');
        return;
      }

      console.log('Starting call with your custom workflow...');

      // Try a different approach with a workflow ID as a string
      // This is the workflow ID from your .env.local file
      const workflowId = "2eda67a8e7814018";

      console.log('Using simplified workflow ID:', workflowId);

      // Start the call with just the workflow ID as a string
      await vapiRef.current.start(workflowId);

      console.log('Call started successfully');
    } catch (error) {
      console.error('Error starting call:', error);

      // Create a detailed error message
      const errorMsg = error instanceof Error ? error.message : String(error);

      // Check for specific error types
      if (errorMsg.includes('unauthorized') || errorMsg.includes('domain')) {
        toast.error(`Domain authorization error: Your domain is not authorized. Please contact Vapi support.`);
      } else if (errorMsg.includes('microphone') || errorMsg.includes('audio') || errorMsg.includes('permission')) {
        toast.error('Microphone access is required. Please grant microphone permissions and try again.');
      } else if (errorMsg.includes('404') || errorMsg.includes('Not Found')) {
        toast.error('Workflow not found. Please check your workflow ID.');
      } else if (errorMsg.includes('{}') || errorMsg === '{}') {
        toast.error('Empty error response. This might be due to a domain authorization issue or an invalid workflow ID.');
      } else {
        toast.error(`Error starting call: ${errorMsg}`);
      }

      // Log detailed error information
      console.log('Error details:', {
        message: errorMsg,
        workflowId: "2eda67a8-e781-4018-8b68-7a1af216deb8",
        token: "29470ff4-913a-4394-bff5-0d0e2828cb68".substring(0, 5) + '...'
      });
    }
  };

  const stopCall = () => {
    try {
      if (!vapiRef.current) {
        toast.error('Vapi is not initialized yet.');
        return;
      }

      vapiRef.current.stop();
      setIsCallActive(false);
      toast.success('Call stopped');
    } catch (error) {
      console.error('Error stopping call:', error);
      const errorMsg = error instanceof Error ? error.message : String(error);
      toast.error(`Error stopping call: ${errorMsg}`);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Test Custom Workflow</h1>

      <div className="mb-4">
        <p>This page tests your custom Vapi workflow directly.</p>
      </div>

      {!hasMicPermission && (
        <div className="mb-4 p-4 bg-yellow-100 rounded-lg">
          <p className="text-yellow-800 mb-2">Microphone access is required for the interview</p>
          <Button onClick={handleRequestPermission}>
            Grant Microphone Access
          </Button>
        </div>
      )}

      <div className="flex gap-4 mb-4">
        <Button
          onClick={startCall}
          disabled={isCallActive || !hasMicPermission}
          className="bg-blue-500 hover:bg-blue-600"
        >
          Start Call with Custom Workflow
        </Button>

        <Button
          onClick={stopCall}
          disabled={!isCallActive}
          variant="destructive"
        >
          Stop Call
        </Button>
      </div>

      <div className="mb-4">
        <p>Call Status: <span className="font-bold">{isCallActive ? 'Active' : 'Inactive'}</span></p>
        <p>Speaking: <span className="font-bold">{isSpeaking ? 'Yes' : 'No'}</span></p>
      </div>

      {messages.length > 0 && (
        <div className="p-4 bg-gray-100 rounded-lg">
          <h2 className="text-lg font-bold mb-2">Conversation</h2>
          {messages.map((message, index) => (
            <div key={index} className={`mb-2 p-2 rounded-lg ${message.role === 'assistant' ? 'bg-blue-100' : 'bg-green-100'}`}>
              <p className="font-bold">{message.role === 'assistant' ? 'Connor' : 'You'}</p>
              <p>{message.content}</p>
            </div>
          ))}
        </div>
      )}

      <div className="mt-8 p-4 bg-gray-100 rounded-lg">
        <h2 className="text-lg font-bold mb-2">Troubleshooting Tips</h2>
        <ul className="list-disc pl-5">
          <li>Make sure your microphone is working properly</li>
          <li>Check that you've granted microphone permissions</li>
          <li>Ensure your Vapi workflow ID is correct</li>
          <li>Try refreshing the page if you encounter issues</li>
          <li>Check the browser console for any error messages</li>
        </ul>
      </div>
    </div>
  );
};

export default TestWorkflow;
