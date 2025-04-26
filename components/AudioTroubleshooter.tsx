'use client';

import React, { useState, useEffect } from 'react';
import { checkMicrophonePermission, requestMicrophonePermission, getAudioInputDevices, testAudioInput } from '@/lib/audio-utils';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface AudioTroubleshooterProps {
  onPermissionGranted?: () => void;
}

const AudioTroubleshooter: React.FC<AudioTroubleshooterProps> = ({ onPermissionGranted }) => {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [volumeLevel, setVolumeLevel] = useState(0);
  const [isTesting, setIsTesting] = useState(false);

  // Check microphone permission on component mount
  useEffect(() => {
    const checkPermission = async () => {
      const permission = await checkMicrophonePermission();
      setHasPermission(permission);
      if (permission) {
        loadAudioDevices();
        if (onPermissionGranted) onPermissionGranted();
      }
    };
    
    checkPermission();
  }, [onPermissionGranted]);

  // Load available audio devices
  const loadAudioDevices = async () => {
    const devices = await getAudioInputDevices();
    setAudioDevices(devices);
    
    // Select the default device if available
    if (devices.length > 0) {
      const defaultDevice = devices.find(device => device.deviceId === 'default') || devices[0];
      setSelectedDeviceId(defaultDevice.deviceId);
    }
  };

  // Request microphone permission
  const handleRequestPermission = async () => {
    setIsChecking(true);
    const granted = await requestMicrophonePermission();
    setHasPermission(granted);
    setIsChecking(false);
    
    if (granted) {
      toast.success('Microphone access granted!');
      loadAudioDevices();
      if (onPermissionGranted) onPermissionGranted();
    } else {
      toast.error('Microphone access denied. Please enable it in your browser settings.');
    }
  };

  // Test audio input
  const handleTestMicrophone = async () => {
    setIsTesting(true);
    const result = await testAudioInput(selectedDeviceId);
    setIsTesting(false);
    
    if (result.success) {
      setVolumeLevel(result.volumeLevel);
      if (result.volumeLevel < 10) {
        toast.warning('Microphone volume is very low. Please speak louder or check your microphone settings.');
      } else {
        toast.success('Microphone is working properly!');
      }
    } else {
      toast.error('Failed to test microphone. Please check your device settings.');
    }
  };

  // Handle device selection change
  const handleDeviceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedDeviceId(e.target.value);
  };

  return (
    <div className="audio-troubleshooter p-4 bg-dark-200 rounded-lg">
      <h3 className="text-lg font-medium mb-4">Audio Setup</h3>
      
      {hasPermission === null ? (
        <p>Checking microphone permission...</p>
      ) : hasPermission ? (
        <>
          <div className="mb-4">
            <p className="text-green-500 mb-2">✓ Microphone access granted</p>
            
            {audioDevices.length > 0 ? (
              <div className="mt-4">
                <label htmlFor="audioDevice" className="block mb-2">Select Microphone:</label>
                <select 
                  id="audioDevice"
                  value={selectedDeviceId}
                  onChange={handleDeviceChange}
                  className="w-full p-2 bg-dark-300 rounded border border-light-600"
                >
                  {audioDevices.map(device => (
                    <option key={device.deviceId} value={device.deviceId}>
                      {device.label || `Microphone ${device.deviceId.substring(0, 5)}...`}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <p className="text-yellow-500">No audio devices detected</p>
            )}
            
            <div className="mt-4">
              <Button 
                onClick={handleTestMicrophone} 
                disabled={isTesting || audioDevices.length === 0}
                className="w-full"
              >
                {isTesting ? 'Testing...' : 'Test Microphone'}
              </Button>
              
              {volumeLevel > 0 && (
                <div className="mt-2">
                  <p>Volume Level: {Math.round(volumeLevel)}</p>
                  <div className="w-full bg-dark-300 rounded-full h-2.5 mt-1">
                    <div 
                      className={`h-2.5 rounded-full ${volumeLevel < 10 ? 'bg-red-500' : volumeLevel < 30 ? 'bg-yellow-500' : 'bg-green-500'}`} 
                      style={{ width: `${Math.min(100, volumeLevel)}%` }}
                    ></div>
                  </div>
                </div>
              )}
            </div>
          </div>
          
          <div className="mt-4 text-sm text-light-400">
            <h4 className="font-medium mb-1">Audio Troubleshooting Tips:</h4>
            <ul className="list-disc pl-5 space-y-1">
              <li>Make sure your microphone is not muted</li>
              <li>Check if the correct microphone is selected</li>
              <li>Try speaking louder or moving closer to your microphone</li>
              <li>Close other applications that might be using your microphone</li>
              <li>Refresh the page if audio issues persist</li>
            </ul>
          </div>
        </>
      ) : (
        <div>
          <p className="text-red-500 mb-4">Microphone access is required for the interview</p>
          <Button 
            onClick={handleRequestPermission} 
            disabled={isChecking}
            className="w-full"
          >
            {isChecking ? 'Requesting Access...' : 'Grant Microphone Access'}
          </Button>
          
          <div className="mt-4 text-sm text-light-400">
            <p>If you're having trouble:</p>
            <ol className="list-decimal pl-5 space-y-1">
              <li>Make sure your browser supports microphone access</li>
              <li>Check if microphone permissions are blocked in your browser settings</li>
              <li>Try using a different browser if issues persist</li>
            </ol>
          </div>
        </div>
      )}
    </div>
  );
};

export default AudioTroubleshooter;
