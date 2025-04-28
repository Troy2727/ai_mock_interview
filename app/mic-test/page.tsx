'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

const MicTest = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [volumeLevel, setVolumeLevel] = useState(0);
  const [permissionStatus, setPermissionStatus] = useState<string>('unknown');
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Check microphone permission on component mount
  useEffect(() => {
    const checkPermission = async () => {
      try {
        const result = await navigator.permissions.query({ name: 'microphone' as PermissionName });
        setPermissionStatus(result.state);
        
        // Listen for permission changes
        result.onchange = () => {
          setPermissionStatus(result.state);
          if (result.state === 'granted') {
            loadAudioDevices();
          }
        };
        
        if (result.state === 'granted') {
          loadAudioDevices();
        }
      } catch (error) {
        console.error('Error checking microphone permission:', error);
        setPermissionStatus('error');
      }
    };
    
    checkPermission();
    
    // Clean up on component unmount
    return () => {
      stopRecording();
    };
  }, []);

  // Load available audio devices
  const loadAudioDevices = async () => {
    try {
      // Get list of audio input devices
      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioInputs = devices.filter(device => device.kind === 'audioinput');
      
      setAudioDevices(audioInputs);
      
      // Select the default device if available
      if (audioInputs.length > 0) {
        const defaultDevice = audioInputs.find(device => device.deviceId === 'default') || audioInputs[0];
        setSelectedDeviceId(defaultDevice.deviceId);
      }
    } catch (error) {
      console.error('Error loading audio devices:', error);
      toast.error('Failed to load audio devices. Please check your browser settings.');
    }
  };

  // Request microphone permission
  const requestPermission = async () => {
    try {
      // Request access to the microphone
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Stop the stream immediately - we just needed it to trigger the permission prompt
      stream.getTracks().forEach(track => track.stop());
      
      // Check permission status again
      const result = await navigator.permissions.query({ name: 'microphone' as PermissionName });
      setPermissionStatus(result.state);
      
      if (result.state === 'granted') {
        toast.success('Microphone access granted!');
        loadAudioDevices();
      } else {
        toast.error('Microphone access not granted. Please check your browser settings.');
      }
    } catch (error) {
      console.error('Error requesting microphone permission:', error);
      toast.error('Failed to request microphone permission. Please check your browser settings.');
      setPermissionStatus('denied');
    }
  };

  // Start recording and measuring volume
  const startRecording = async () => {
    try {
      // Stop any existing recording
      stopRecording();
      
      // Get audio stream from selected device
      const constraints = {
        audio: {
          deviceId: selectedDeviceId ? { exact: selectedDeviceId } : undefined
        }
      };
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      mediaStreamRef.current = stream;
      
      // Create audio context and analyser
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextRef.current = audioContext;
      
      const analyser = audioContext.createAnalyser();
      analyserRef.current = analyser;
      
      // Connect the stream to the analyser
      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);
      
      // Configure analyser
      analyser.fftSize = 256;
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      
      // Start measuring volume
      const measureVolume = () => {
        if (!analyserRef.current) return;
        
        analyser.getByteFrequencyData(dataArray);
        
        // Calculate average volume
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const average = sum / bufferLength;
        
        // Update volume level (scale to 0-100)
        setVolumeLevel(average * (100 / 255));
        
        // Continue measuring
        animationFrameRef.current = requestAnimationFrame(measureVolume);
      };
      
      // Start measuring
      measureVolume();
      
      setIsRecording(true);
      toast.success('Microphone test started');
    } catch (error) {
      console.error('Error starting microphone test:', error);
      toast.error('Failed to start microphone test. Please check your microphone settings.');
    }
  };

  // Stop recording
  const stopRecording = () => {
    // Stop animation frame
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    
    // Stop audio context
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    
    // Stop media stream
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    
    // Reset analyser
    analyserRef.current = null;
    
    setIsRecording(false);
    setVolumeLevel(0);
  };

  // Handle device selection change
  const handleDeviceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedDeviceId(e.target.value);
    
    // If currently recording, restart with new device
    if (isRecording) {
      stopRecording();
      setTimeout(() => startRecording(), 100);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Microphone Test</h1>
      
      <div className="mb-6 p-4 bg-gray-100 rounded-lg">
        <h2 className="text-lg font-bold mb-2">Microphone Permission</h2>
        <p className="mb-2">Current status: 
          <span className={`font-bold ml-2 ${
            permissionStatus === 'granted' ? 'text-green-600' : 
            permissionStatus === 'denied' ? 'text-red-600' : 
            permissionStatus === 'prompt' ? 'text-yellow-600' : 'text-gray-600'
          }`}>
            {permissionStatus === 'granted' ? 'Granted' : 
             permissionStatus === 'denied' ? 'Denied' : 
             permissionStatus === 'prompt' ? 'Not yet requested' : 
             permissionStatus === 'error' ? 'Error checking permission' : 'Unknown'}
          </span>
        </p>
        
        {permissionStatus !== 'granted' && (
          <Button onClick={requestPermission} className="mt-2">
            Request Microphone Permission
          </Button>
        )}
      </div>
      
      {permissionStatus === 'granted' && (
        <>
          <div className="mb-6">
            <h2 className="text-lg font-bold mb-2">Select Microphone</h2>
            {audioDevices.length > 0 ? (
              <select 
                value={selectedDeviceId}
                onChange={handleDeviceChange}
                className="w-full p-2 border border-gray-300 rounded mb-4"
              >
                {audioDevices.map(device => (
                  <option key={device.deviceId} value={device.deviceId}>
                    {device.label || `Microphone ${device.deviceId.substring(0, 5)}...`}
                  </option>
                ))}
              </select>
            ) : (
              <p className="text-yellow-600 mb-4">No audio devices detected</p>
            )}
            
            <div className="flex gap-4">
              <Button 
                onClick={isRecording ? stopRecording : startRecording}
                className={isRecording ? 'bg-red-500 hover:bg-red-600' : 'bg-blue-500 hover:bg-blue-600'}
                disabled={audioDevices.length === 0}
              >
                {isRecording ? 'Stop Test' : 'Start Test'}
              </Button>
              
              {isRecording && (
                <p className="flex items-center">
                  <span className="inline-block w-3 h-3 bg-red-500 rounded-full animate-pulse mr-2"></span>
                  Recording...
                </p>
              )}
            </div>
          </div>
          
          {isRecording && (
            <div className="mb-6">
              <h2 className="text-lg font-bold mb-2">Volume Level</h2>
              <div className="w-full bg-gray-200 rounded-full h-4 mb-2">
                <div 
                  className={`h-4 rounded-full ${
                    volumeLevel < 10 ? 'bg-red-500' : 
                    volumeLevel < 30 ? 'bg-yellow-500' : 'bg-green-500'
                  }`} 
                  style={{ width: `${Math.min(100, volumeLevel)}%` }}
                ></div>
              </div>
              <p className="text-sm">
                {volumeLevel < 10 ? 'Very low - Please speak louder or check your microphone' : 
                 volumeLevel < 30 ? 'Low - Try speaking a bit louder' : 
                 volumeLevel < 70 ? 'Good - Your microphone is working well' : 
                 'Excellent - Your microphone is picking up audio clearly'}
              </p>
            </div>
          )}
        </>
      )}
      
      <div className="mt-8 p-4 bg-gray-100 rounded-lg">
        <h2 className="text-lg font-bold mb-2">Troubleshooting Tips</h2>
        <ul className="list-disc pl-5 space-y-2">
          <li>Make sure your microphone is not muted in your system settings</li>
          <li>Check if your microphone is properly connected to your computer</li>
          <li>Try selecting a different microphone if you have multiple devices</li>
          <li>Close other applications that might be using your microphone</li>
          <li>Try using a different browser (Chrome, Firefox, Edge)</li>
          <li>Restart your browser or computer if issues persist</li>
          <li>Check your browser's privacy settings to ensure microphone access is allowed</li>
        </ul>
      </div>
    </div>
  );
};

export default MicTest;
