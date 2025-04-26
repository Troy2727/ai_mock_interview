'use client';

import { useState, useEffect, useRef } from 'react';
import { getVapiInstance } from '@/lib/vapi.sdk';
import { toast } from 'sonner';
import Loading from './Loading';

interface VapiDataDisplayProps {
  userId: string;
  userName: string;
}

const VapiDataDisplay = ({ userId, userName }: VapiDataDisplayProps) => {
  const [isConnected, setIsConnected] = useState(false);
  const [transcript, setTranscript] = useState<Array<{role: string, content: string}>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const transcriptEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to the bottom when new messages are added
  useEffect(() => {
    if (transcriptEndRef.current) {
      transcriptEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [transcript]);

  useEffect(() => {
    const initVapi = async () => {
      try {
        setIsLoading(true);
        const vapi = getVapiInstance({
          onConnectionLost: () => {
            setIsConnected(false);
            setError('Connection to Vapi was lost. Attempting to reconnect...');
            toast.error('Connection lost. Attempting to reconnect...');
          },
          onReconnectSuccess: () => {
            setIsConnected(true);
            setError(null);
            toast.success('Reconnected successfully!');
          },
          onEjection: () => {
            setIsConnected(false);
            setError('Session was terminated. Please refresh the page.');
            toast.error('Session terminated. Please refresh the page.');
          }
        });

        // Set up event listeners
        vapi.on('transcript', (message) => {
          if (message.transcriptType === 'final') {
            setTranscript(prev => [...prev, {
              role: message.role,
              content: message.transcript
            }]);
          }
        });

        vapi.on('call-start', () => {
          setIsConnected(true);
          setError(null);
        });

        vapi.on('call-end', () => {
          setIsConnected(false);
        });

        setIsLoading(false);
      } catch (err) {
        setError('Failed to initialize Vapi connection');
        setIsLoading(false);
        toast.error('Failed to connect to Vapi service');
        console.error('Vapi initialization error:', err);
      }
    };

    initVapi();

    return () => {
      // Clean up Vapi instance when component unmounts
      try {
        const vapi = getVapiInstance();
        vapi.stop();
      } catch (err) {
        console.warn('Error stopping Vapi instance:', err);
      }
    };
  }, []);

  if (isLoading) return <Loading />;

  if (error) {
    return (
      <div className="p-4 bg-red-900/20 rounded-lg">
        <h3 className="text-red-400 font-medium">Connection Error</h3>
        <p>{error}</p>
        <button
          className="mt-2 px-4 py-2 bg-primary-500 rounded-md"
          onClick={() => window.location.reload()}
        >
          Refresh Page
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-lg">
      <div className="flex items-center justify-between mb-4">
        <div className={`px-2 py-1 rounded-full text-xs ${isConnected ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
          {isConnected ? 'Connected' : 'Disconnected'}
        </div>
      </div>

      <div className="max-h-[300px] overflow-y-auto scrollbar-thin scrollbar-thumb-dark-400 scrollbar-track-dark-200">
        {transcript.length > 0 ? (
          transcript.map((item, index) => (
            <div key={index} className={`mb-2 p-2 rounded ${item.role === 'user' ? 'bg-dark-300' : 'bg-primary-900/20'}`}>
              <span className="font-bold">{item.role === 'user' ? userName : 'Assistant'}: </span>
              {item.content}
            </div>
          ))
        ) : (
          <p className="text-gray-400">No transcript data available yet. Start speaking to see the conversation.</p>
        )}
        {/* This empty div is used as a reference for auto-scrolling */}
        <div ref={transcriptEndRef} />
      </div>
    </div>
  );
};

export default VapiDataDisplay;
