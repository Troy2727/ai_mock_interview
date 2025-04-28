'use client';

import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

const TestVapiDirect = () => {
  const [isCallActive, setIsCallActive] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState('');
  const vapiRef = useRef<any>(null);

  useEffect(() => {
    // Import Vapi SDK
    const importVapi = async () => {
      try {
        const VapiModule = await import('@vapi-ai/web');
        const Vapi = VapiModule.default;

        // Create Vapi instance
        const vapiInstance = new Vapi(process.env.NEXT_PUBLIC_VAPI_WEB_TOKEN!);

        // Set up event handlers
        vapiInstance.on('error', (error: any) => {
          console.error('Vapi error:', error);
          toast.error(`Vapi error: ${error instanceof Error ? error.message : String(error)}`);
        });

        vapiInstance.on('call-start', () => {
          console.log('Call started');
          setIsCallActive(true);
          toast.success('Call started');
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
            setTranscript(message.transcript);
          }
        });

        // Store Vapi instance in ref
        vapiRef.current = vapiInstance;
        console.log('Vapi instance created successfully');
      } catch (error) {
        console.error('Error initializing Vapi:', error);
        toast.error(`Error initializing Vapi: ${error instanceof Error ? error.message : String(error)}`);
      }
    };

    importVapi();

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

  const startCall = async () => {
    try {
      if (!vapiRef.current) {
        toast.error('Vapi is not initialized yet. Please wait a moment and try again.');
        return;
      }

      console.log('Starting call...');

      // Use the workflow ID directly
      const workflowId = "2eda67a8-e781-4018-8b68-7a1af216deb8";

      console.log('Using workflow ID:', workflowId);

      // Start the call with the workflow ID
      await vapiRef.current.start(workflowId);

      console.log('Call started successfully');
    } catch (error) {
      console.error('Error starting call:', error);
      toast.error(`Error starting call: ${error instanceof Error ? error.message : String(error)}`);
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
      toast.error(`Error stopping call: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Test Vapi Direct</h1>

      <div className="mb-4">
        <p>This page tests the Vapi SDK directly without any custom wrappers.</p>
      </div>

      <div className="flex gap-4 mb-4">
        <Button onClick={startCall} disabled={isCallActive}>
          Start Call
        </Button>

        <Button onClick={stopCall} disabled={!isCallActive} variant="destructive">
          Stop Call
        </Button>
      </div>

      <div className="mb-4">
        <p>Call Status: <span className="font-bold">{isCallActive ? 'Active' : 'Inactive'}</span></p>
        <p>Speaking: <span className="font-bold">{isSpeaking ? 'Yes' : 'No'}</span></p>
      </div>

      {transcript && (
        <div className="p-4 bg-gray-100 rounded-lg">
          <h2 className="text-lg font-bold mb-2">Transcript</h2>
          <p>{transcript}</p>
        </div>
      )}
    </div>
  );
};

export default TestVapiDirect;
