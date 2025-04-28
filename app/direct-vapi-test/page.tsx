'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

const DirectVapiTest = () => {
  const [status, setStatus] = useState<string>('Initializing...');
  const [logs, setLogs] = useState<string[]>([]);
  const [isCallActive, setIsCallActive] = useState(false);
  const vapiRef = useRef<any>(null);
  
  // Add a log function
  const addLog = (message: string) => {
    console.log(message);
    setLogs(prev => [...prev, `${new Date().toISOString().split('T')[1].split('.')[0]} - ${message}`]);
  };
  
  // Initialize Vapi
  useEffect(() => {
    const initVapi = async () => {
      try {
        addLog('Importing Vapi SDK...');
        const VapiModule = await import('@vapi-ai/web');
        const Vapi = VapiModule.default;
        
        addLog('Creating Vapi instance...');
        const token = "29470ff4-913a-4394-bff5-0d0e2828cb68";
        const vapiInstance = new Vapi(token);
        
        // Set up event handlers
        vapiInstance.on('error', (error: any) => {
          const errorMsg = error instanceof Error ? error.message : String(error);
          addLog(`ERROR: ${errorMsg}`);
        });
        
        vapiInstance.on('call-start', () => {
          addLog('Event: call-start');
          setIsCallActive(true);
          setStatus('Call active');
        });
        
        vapiInstance.on('call-end', () => {
          addLog('Event: call-end');
          setIsCallActive(false);
          setStatus('Call ended');
        });
        
        vapiInstance.on('speech-start', () => {
          addLog('Event: speech-start');
        });
        
        vapiInstance.on('speech-end', () => {
          addLog('Event: speech-end');
        });
        
        vapiInstance.on('message', (message: any) => {
          addLog(`Event: message - ${JSON.stringify(message)}`);
        });
        
        vapiInstance.on('ejection', (error: any) => {
          const errorMsg = error instanceof Error ? error.message : String(error);
          addLog(`Event: ejection - ${errorMsg}`);
          setIsCallActive(false);
          setStatus('Call ejected');
        });
        
        // Store the instance
        vapiRef.current = vapiInstance;
        addLog('Vapi initialized successfully');
        setStatus('Ready');
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        addLog(`Error initializing Vapi: ${errorMsg}`);
        setStatus('Initialization failed');
      }
    };
    
    initVapi();
    
    // Clean up
    return () => {
      if (vapiRef.current) {
        try {
          vapiRef.current.stop();
        } catch (error) {
          console.warn('Error stopping Vapi:', error);
        }
      }
    };
  }, []);
  
  // Start call
  const startCall = async () => {
    try {
      if (!vapiRef.current) {
        toast.error('Vapi is not initialized');
        return;
      }
      
      setStatus('Starting call...');
      addLog('Starting call with workflow ID...');
      
      // Use the workflow ID directly
      const workflowId = "2eda67a8-e781-4018-8b68-7a1af216deb8";
      
      // Start the call
      await vapiRef.current.start(workflowId);
      
      addLog('Call started successfully');
      setStatus('Call active');
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      addLog(`Error starting call: ${errorMsg}`);
      setStatus('Call failed');
      toast.error(`Failed to start call: ${errorMsg}`);
    }
  };
  
  // Stop call
  const stopCall = async () => {
    try {
      if (!vapiRef.current) {
        toast.error('Vapi is not initialized');
        return;
      }
      
      setStatus('Stopping call...');
      addLog('Stopping call...');
      
      // Stop the call
      await vapiRef.current.stop();
      
      addLog('Call stopped successfully');
      setStatus('Call stopped');
      setIsCallActive(false);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      addLog(`Error stopping call: ${errorMsg}`);
      setStatus('Stop failed');
      toast.error(`Failed to stop call: ${errorMsg}`);
    }
  };
  
  // Clear logs
  const clearLogs = () => {
    setLogs([]);
  };
  
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Direct Vapi Test</h1>
      <p className="mb-4">This page tests the Vapi SDK directly without any wrappers or error handlers.</p>
      
      <div className="mb-4 p-4 bg-gray-100 rounded-lg">
        <h2 className="text-lg font-bold mb-2">Status: {status}</h2>
        
        <div className="flex gap-4 mt-4">
          <Button 
            onClick={startCall} 
            disabled={isCallActive || status === 'Initializing...' || status === 'Starting call...'}
            className="bg-blue-500 hover:bg-blue-600"
          >
            Start Call
          </Button>
          
          <Button 
            onClick={stopCall} 
            disabled={!isCallActive}
            className="bg-red-500 hover:bg-red-600"
          >
            Stop Call
          </Button>
          
          <Button 
            onClick={clearLogs}
            variant="outline"
          >
            Clear Logs
          </Button>
        </div>
      </div>
      
      <div className="mb-4">
        <h2 className="text-lg font-bold mb-2">Logs</h2>
        <div className="bg-black text-green-400 p-4 rounded-lg h-96 overflow-y-auto font-mono text-sm">
          {logs.map((log, index) => (
            <div key={index} className="mb-1">{log}</div>
          ))}
        </div>
      </div>
      
      <div className="mt-8 p-4 bg-gray-100 rounded-lg">
        <h2 className="text-lg font-bold mb-2">Troubleshooting Tips</h2>
        <ul className="list-disc pl-5">
          <li>Make sure your microphone is working properly</li>
          <li>Check that you've granted microphone permissions in your browser</li>
          <li>Try using a different browser (Chrome is recommended)</li>
          <li>Check the logs for any error messages</li>
          <li>If you see "Meeting ended due to ejection", it means the Vapi service terminated the call</li>
        </ul>
      </div>
    </div>
  );
};

export default DirectVapiTest;
