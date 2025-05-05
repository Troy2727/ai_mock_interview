'use client';

import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { MockVapi } from '@/lib/vapi/mock';

// Define call status enum
enum CallStatus {
  INACTIVE = 'inactive',
  CONNECTING = 'connecting',
  ACTIVE = 'active',
  FINISHED = 'finished',
}

export default function MockVapiTestPage() {
  // State for UI
  const [callStatus, setCallStatus] = useState<CallStatus>(CallStatus.INACTIVE);
  const [transcript, setTranscript] = useState<{ role: string; content: string }[]>([]);
  const [logs, setLogs] = useState<string[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  // Refs
  const vapiRef = useRef<any>(null);
  
  // Add a log message
  const addLog = (message: string) => {
    setLogs(prev => [...prev, `${new Date().toISOString().split('T')[1].split('.')[0]} - ${message}`]);
  };
  
  // Initialize MockVapi when the component mounts
  useEffect(() => {
    const initVapi = async () => {
      try {
        addLog('Creating MockVapi instance...');
        
        // Create a new MockVapi instance with a token (can be any string)
        const mockVapiInstance = new MockVapi('mock-token');
        
        // Set up event handlers
        mockVapiInstance.on('error', (error: any) => {
          const errorMsg = error instanceof Error ? error.message : String(error);
          addLog(`ERROR: ${errorMsg}`);
          setErrorMessage(errorMsg);
          toast.error(errorMsg);
        });
        
        mockVapiInstance.on('call-start', () => {
          addLog('Event: call-start');
          setCallStatus(CallStatus.ACTIVE);
          toast.success('Mock call started');
        });
        
        mockVapiInstance.on('call-end', () => {
          addLog('Event: call-end');
          setCallStatus(CallStatus.INACTIVE);
          toast.info('Mock call ended');
        });
        
        mockVapiInstance.on('transcript', (message: any) => {
          if (message.transcriptType === 'final') {
            addLog(`Transcript (${message.role}): ${message.transcript}`);
            setTranscript(prev => [...prev, {
              role: message.role,
              content: message.transcript
            }]);
          }
        });
        
        // Store the MockVapi instance in the ref
        vapiRef.current = mockVapiInstance;
        addLog('MockVapi instance created successfully');
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        addLog(`Error initializing MockVapi: ${errorMsg}`);
        setErrorMessage(`Error initializing MockVapi: ${errorMsg}`);
        toast.error(`Error initializing MockVapi: ${errorMsg}`);
      }
    };
    
    initVapi();
    
    // Clean up when component unmounts
    return () => {
      if (vapiRef.current) {
        try {
          vapiRef.current.stop();
          addLog('MockVapi instance stopped');
        } catch (error) {
          addLog(`Error stopping MockVapi: ${error}`);
        }
      }
    };
  }, []);
  
  // Handle starting a call
  const handleStartCall = async () => {
    try {
      if (!vapiRef.current) {
        toast.error('MockVapi is not initialized yet');
        return;
      }
      
      setCallStatus(CallStatus.CONNECTING);
      addLog('Starting mock call...');
      
      // Start the call with a mock workflow ID
      await vapiRef.current.start('mock-workflow-id');
      
      addLog('Mock call started successfully');
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      addLog(`Error starting mock call: ${errorMsg}`);
      setErrorMessage(`Error starting mock call: ${errorMsg}`);
      toast.error(`Error starting mock call: ${errorMsg}`);
      setCallStatus(CallStatus.INACTIVE);
    }
  };
  
  // Handle ending a call
  const handleEndCall = () => {
    try {
      if (!vapiRef.current) {
        toast.error('MockVapi is not initialized yet');
        return;
      }
      
      addLog('Ending mock call...');
      vapiRef.current.stop();
      addLog('Mock call ended successfully');
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      addLog(`Error ending mock call: ${errorMsg}`);
      toast.error(`Error ending mock call: ${errorMsg}`);
    }
  };
  
  // Handle sending a message
  const handleSendMessage = () => {
    try {
      if (!vapiRef.current) {
        toast.error('MockVapi is not initialized yet');
        return;
      }
      
      const message = 'Hello, this is a test message';
      addLog(`Sending message: ${message}`);
      
      vapiRef.current.send({
        type: 'add-message',
        message
      });
      
      addLog('Message sent successfully');
      
      // Add to transcript
      setTranscript(prev => [...prev, {
        role: 'user',
        content: message
      }]);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      addLog(`Error sending message: ${errorMsg}`);
      toast.error(`Error sending message: ${errorMsg}`);
    }
  };
  
  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <h1 className="text-2xl font-bold mb-4">Mock Vapi Test</h1>
      
      <div className="mb-6">
        <p className="text-sm text-gray-400 mb-2">
          This page uses a mock implementation of Vapi for testing without domain restrictions.
        </p>
        
        <div className="flex gap-2 mb-4">
          {callStatus === CallStatus.INACTIVE ? (
            <button
              onClick={handleStartCall}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Start Mock Call
            </button>
          ) : (
            <button
              onClick={handleEndCall}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              End Mock Call
            </button>
          )}
          
          {callStatus === CallStatus.ACTIVE && (
            <button
              onClick={handleSendMessage}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
            >
              Send Test Message
            </button>
          )}
        </div>
        
        <div className="text-sm">
          Call Status: <span className="font-semibold">{callStatus}</span>
        </div>
        
        {errorMessage && (
          <div className="mt-2 p-2 bg-red-900/20 rounded text-red-400 text-sm">
            {errorMessage}
          </div>
        )}
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="border border-gray-700 rounded p-4">
          <h2 className="text-lg font-semibold mb-2">Transcript</h2>
          <div className="h-64 overflow-y-auto bg-gray-900/50 rounded p-2">
            {transcript.length === 0 ? (
              <p className="text-gray-500 text-sm">No transcript yet. Start a call and send a message.</p>
            ) : (
              transcript.map((item, index) => (
                <div key={index} className="mb-2">
                  <div className="text-xs text-gray-400">{item.role}</div>
                  <div className={`p-2 rounded ${item.role === 'assistant' ? 'bg-blue-900/20' : 'bg-gray-800'}`}>
                    {item.content}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
        
        <div className="border border-gray-700 rounded p-4">
          <h2 className="text-lg font-semibold mb-2">Logs</h2>
          <div className="h-64 overflow-y-auto bg-gray-900/50 rounded p-2 font-mono text-xs">
            {logs.map((log, index) => (
              <div key={index} className="mb-1">
                {log}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
