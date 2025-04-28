'use client';

import VapiDataDisplay from '@/components/VapiDataDisplay';
import AudioTroubleshooter from '@/components/AudioTroubleshooter';
import { useEffect, useState } from 'react';
import { getVapiInstance, startEnhancedCall } from '@/lib/vapi.sdk';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { checkMicrophonePermission } from '@/lib/audio-utils';

export default function TestVapiPage() {
  const [userId] = useState('test-user-123');
  const [userName] = useState('Test User');
  const [isCallActive, setIsCallActive] = useState(false);
  const [hasMicPermission, setHasMicPermission] = useState<boolean | null>(null);
  const [showAudioSetup, setShowAudioSetup] = useState(false);
  const [selectedDeviceId] = useState<string | null>(null);

  // Check microphone permission on component mount
  useEffect(() => {
    const checkPermission = async () => {
      const permission = await checkMicrophonePermission();
      setHasMicPermission(permission);
    };

    checkPermission();
  }, []);

  const handlePermissionGranted = () => {
    setHasMicPermission(true);
    toast.success('Microphone access granted!');
  };

  const startCall = async () => {
    try {
      // Check microphone permission first
      if (!hasMicPermission) {
        setShowAudioSetup(true);
        toast.error('Microphone permission is required');
        return;
      }

      // Initialize Vapi instance with event handlers
      getVapiInstance({
        onConnectionLost: () => {
          toast.error('Connection lost');
          setIsCallActive(false);
        },
        onReconnectSuccess: () => {
          toast.success('Reconnected successfully');
          setIsCallActive(true);
        },
        onEjection: () => {
          toast.error('Call was ejected');
          setIsCallActive(false);
        }
      });

      // Check if VAPI_WEB_TOKEN is configured
      if (!process.env.NEXT_PUBLIC_VAPI_WEB_TOKEN) {
        toast.error('VAPI_WEB_TOKEN is not configured. Please add it to your .env.local file.');
        console.error('Missing VAPI_WEB_TOKEN environment variable');
        return;
      }

      // Example assistant config - replace with your actual workflow ID or config
      await startEnhancedCall({
        model: {
          provider: 'anthropic',
          model: 'claude-3-opus-20240229',
          temperature: 0.7,
        },
        firstMessage: "Hello! I'm an AI assistant. How can I help you today?",
      });

      setIsCallActive(true);
      toast.success('Call started successfully');
    } catch (error) {
      console.error('Failed to start call:', error);
      toast.error(`Failed to start call: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const stopCall = () => {
    try {
      const vapi = getVapiInstance();
      vapi.stop();
      setIsCallActive(false);
      toast.success('Call ended');
    } catch (error) {
      console.error('Error stopping call:', error);
      toast.error('Error stopping call');
    }
  };

  return (
    <div className="container mx-auto p-4 max-w-6xl">
      <h1 className="text-2xl font-bold mb-6 text-center">Vapi SDK Test</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="bg-dark-100 rounded-lg p-4">
          <h2 className="text-xl font-semibold mb-4">Audio Setup</h2>
          <div className="mb-4">
            <Button
              onClick={() => setShowAudioSetup(!showAudioSetup)}
              className="w-full bg-dark-300 hover:bg-dark-400"
            >
              {showAudioSetup ? 'Hide Audio Setup' : 'Show Audio Setup'}
            </Button>
          </div>

          {showAudioSetup && (
            <div className="mb-4">
              <AudioTroubleshooter onPermissionGranted={handlePermissionGranted} />
            </div>
          )}

          <div className="mt-4">
            <div className="flex gap-4 justify-center">
              <Button
                onClick={startCall}
                disabled={isCallActive || hasMicPermission === false}
                className={`${isCallActive ? 'bg-gray-500' : 'bg-primary-500 hover:bg-primary-600'}`}
              >
                Start Call
              </Button>

              <Button
                onClick={stopCall}
                disabled={!isCallActive}
                variant="destructive"
                className={`${!isCallActive ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                End Call
              </Button>
            </div>
          </div>
        </div>

        <div className="bg-dark-100 rounded-lg p-4">
          <h2 className="text-xl font-semibold mb-4">Live Transcript</h2>
          <div className="border border-dark-300 rounded-lg p-4 bg-dark-200 min-h-[200px]">
            <VapiDataDisplay userId={userId} userName={userName} />
          </div>
        </div>
      </div>

      <div className="mt-6 p-4 bg-dark-200 rounded-lg">
        <h2 className="text-xl font-semibold mb-2">Audio Troubleshooting Tips</h2>
        <p className="mb-2">If you're having issues with the audio:</p>
        <ol className="list-decimal pl-5 space-y-1">
          <li>Make sure your microphone is connected and not muted</li>
          <li>Check browser permissions for microphone access</li>
          <li>Try refreshing the page</li>
          <li>Use the Audio Setup panel to test your microphone</li>
          <li>Try a different browser if issues persist</li>
        </ol>
      </div>

      {!process.env.NEXT_PUBLIC_VAPI_WEB_TOKEN && (
        <div className="mt-6 p-4 bg-red-900/20 rounded-lg">
          <h2 className="text-xl font-semibold mb-2 text-red-400">Missing API Key</h2>
          <p>The VAPI_WEB_TOKEN environment variable is not configured. Please add it to your .env.local file to enable audio functionality.</p>
          <pre className="mt-2 p-2 bg-dark-300 rounded text-sm overflow-x-auto">
            {`// In .env.local
NEXT_PUBLIC_VAPI_WEB_TOKEN=your_vapi_token_here`}
          </pre>
        </div>
      )}
    </div>
  );
}
