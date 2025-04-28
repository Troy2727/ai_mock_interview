'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface AudioSetupProps {
  onPermissionGranted?: () => void;
  onAudioReady?: () => void;
}

const AudioSetup: React.FC<AudioSetupProps> = ({ onPermissionGranted, onAudioReady }) => {
  const [permissionStatus, setPermissionStatus] = useState<'unknown' | 'granted' | 'denied' | 'prompt'>('unknown');
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [isRecording, setIsRecording] = useState(false);
  const [volumeLevel, setVolumeLevel] = useState(0);
  const [audioContextState, setAudioContextState] = useState<string>('unknown');
  const [browserInfo, setBrowserInfo] = useState<string>('');
  const [isAudioReady, setIsAudioReady] = useState(false);
  
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  
  // Check browser info on mount
  useEffect(() => {
    const userAgent = navigator.userAgent;
    let browserName = 'Unknown';
    let browserVersion = 'Unknown';
    
    if (userAgent.indexOf('Chrome') > -1) {
      browserName = 'Chrome';
      browserVersion = userAgent.match(/Chrome\/([0-9.]+)/)![1];
    } else if (userAgent.indexOf('Firefox') > -1) {
      browserName = 'Firefox';
      browserVersion = userAgent.match(/Firefox\/([0-9.]+)/)![1];
    } else if (userAgent.indexOf('Safari') > -1) {
      browserName = 'Safari';
      browserVersion = userAgent.match(/Version\/([0-9.]+)/)![1];
    } else if (userAgent.indexOf('Edge') > -1 || userAgent.indexOf('Edg') > -1) {
      browserName = 'Edge';
      browserVersion = userAgent.match(/Edge\/([0-9.]+)/) || userAgent.match(/Edg\/([0-9.]+)/)![1];
    }
    
    setBrowserInfo(`${browserName} ${browserVersion}`);
  }, []);
  
  // Check microphone permission on mount
  useEffect(() => {
    const checkPermission = async () => {
      try {
        // Try using the Permissions API first
        if (navigator.permissions && navigator.permissions.query) {
          try {
            const result = await navigator.permissions.query({ name: 'microphone' as PermissionName });
            setPermissionStatus(result.state as 'granted' | 'denied' | 'prompt');
            
            // Listen for permission changes
            result.onchange = () => {
              setPermissionStatus(result.state as 'granted' | 'denied' | 'prompt');
              if (result.state === 'granted') {
                loadAudioDevices();
                if (onPermissionGranted) onPermissionGranted();
              }
            };
            
            if (result.state === 'granted') {
              loadAudioDevices();
              if (onPermissionGranted) onPermissionGranted();
            }
            return;
          } catch (permError) {
            console.warn('Permissions API failed, falling back to getUserMedia:', permError);
          }
        }
        
        // Fallback to getUserMedia
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          stream.getTracks().forEach(track => track.stop());
          setPermissionStatus('granted');
          loadAudioDevices();
          if (onPermissionGranted) onPermissionGranted();
        } catch (mediaError) {
          setPermissionStatus('denied');
        }
      } catch (error) {
        console.error('Error checking microphone permission:', error);
        setPermissionStatus('unknown');
      }
    };
    
    checkPermission();
    
    // Clean up on unmount
    return () => {
      stopRecording();
    };
  }, [onPermissionGranted]);
  
  // Initialize AudioContext
  useEffect(() => {
    const initAudioContext = async () => {
      try {
        // Create AudioContext
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioContextClass) {
          console.error('AudioContext not supported in this browser');
          setAudioContextState('not-supported');
          return;
        }
        
        const context = new AudioContextClass();
        audioContextRef.current = context;
        setAudioContextState(context.state);
        
        // Setup event listener for state changes
        context.onstatechange = () => {
          setAudioContextState(context.state);
          console.log('AudioContext state changed:', context.state);
        };
        
        // Try to resume the context if it's not running
        if (context.state !== 'running') {
          try {
            await context.resume();
            console.log('AudioContext resumed successfully');
          } catch (resumeError) {
            console.error('Failed to resume AudioContext:', resumeError);
          }
        }
      } catch (error) {
        console.error('Error initializing AudioContext:', error);
        setAudioContextState('error');
      }
    };
    
    initAudioContext();
    
    // Clean up on unmount
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(err => {
          console.warn('Error closing AudioContext:', err);
        });
      }
    };
  }, []);
  
  // Load audio devices
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
      
      // Update permission status
      setPermissionStatus('granted');
      toast.success('Microphone access granted!');
      
      // Load audio devices
      loadAudioDevices();
      
      // Notify parent component
      if (onPermissionGranted) onPermissionGranted();
    } catch (error) {
      console.error('Error requesting microphone permission:', error);
      setPermissionStatus('denied');
      toast.error('Microphone access denied. Please enable it in your browser settings.');
    }
  };
  
  // Resume AudioContext
  const resumeAudioContext = async () => {
    if (!audioContextRef.current) {
      toast.error('AudioContext not initialized');
      return;
    }
    
    try {
      await audioContextRef.current.resume();
      setAudioContextState(audioContextRef.current.state);
      toast.success('AudioContext resumed successfully');
    } catch (error) {
      console.error('Error resuming AudioContext:', error);
      toast.error('Failed to resume AudioContext');
    }
  };
  
  // Start recording and measuring volume
  const startRecording = async () => {
    try {
      // Stop any existing recording
      stopRecording();
      
      // Make sure AudioContext is running
      if (audioContextRef.current && audioContextRef.current.state !== 'running') {
        try {
          await audioContextRef.current.resume();
          setAudioContextState(audioContextRef.current.state);
        } catch (resumeError) {
          console.error('Failed to resume AudioContext:', resumeError);
          toast.error('Failed to resume AudioContext. Please try again.');
          return;
        }
      }
      
      // Get audio stream from selected device
      const constraints = {
        audio: {
          deviceId: selectedDeviceId ? { exact: selectedDeviceId } : undefined,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      };
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      mediaStreamRef.current = stream;
      
      // Create analyser if needed
      if (!analyserRef.current && audioContextRef.current) {
        const analyser = audioContextRef.current.createAnalyser();
        analyserRef.current = analyser;
        
        // Configure analyser
        analyser.fftSize = 256;
      }
      
      // Connect the stream to the analyser
      if (audioContextRef.current && analyserRef.current) {
        const source = audioContextRef.current.createMediaStreamSource(stream);
        source.connect(analyserRef.current);
        
        // Start measuring volume
        const bufferLength = analyserRef.current.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        
        const measureVolume = () => {
          if (!analyserRef.current) return;
          
          analyserRef.current.getByteFrequencyData(dataArray);
          
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
      }
      
      setIsRecording(true);
      toast.success('Microphone test started');
      
      // Check if audio is ready
      if (permissionStatus === 'granted' && 
          audioContextState === 'running' && 
          audioDevices.length > 0) {
        setIsAudioReady(true);
        if (onAudioReady) onAudioReady();
      }
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
    
    // Stop media stream
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    
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
  
  // Check if everything is ready
  const checkAudioReady = () => {
    const isReady = permissionStatus === 'granted' && 
                    audioContextState === 'running' && 
                    audioDevices.length > 0 &&
                    volumeLevel > 10;
    
    setIsAudioReady(isReady);
    
    if (isReady) {
      toast.success('Audio is ready!');
      if (onAudioReady) onAudioReady();
    } else {
      let message = 'Audio is not ready. ';
      if (permissionStatus !== 'granted') message += 'Microphone permission not granted. ';
      if (audioContextState !== 'running') message += 'AudioContext not running. ';
      if (audioDevices.length === 0) message += 'No audio devices detected. ';
      if (volumeLevel <= 10) message += 'Microphone volume too low. ';
      
      toast.error(message);
    }
    
    return isReady;
  };
  
  return (
    <div className="audio-setup p-4 bg-gray-100 rounded-lg">
      <h3 className="text-lg font-medium mb-4">Audio Setup</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div className="p-3 bg-white rounded-lg shadow-sm">
          <h4 className="font-medium mb-2">1. Microphone Permission</h4>
          <p className="mb-2">Status: 
            <span className={`ml-2 font-medium ${
              permissionStatus === 'granted' ? 'text-green-600' : 
              permissionStatus === 'denied' ? 'text-red-600' : 
              'text-yellow-600'
            }`}>
              {permissionStatus === 'granted' ? 'Granted ✓' : 
               permissionStatus === 'denied' ? 'Denied ✗' : 
               permissionStatus === 'prompt' ? 'Not requested' : 
               'Unknown'}
            </span>
          </p>
          
          {permissionStatus !== 'granted' && (
            <Button 
              onClick={requestPermission} 
              className="w-full"
            >
              Grant Microphone Permission
            </Button>
          )}
        </div>
        
        <div className="p-3 bg-white rounded-lg shadow-sm">
          <h4 className="font-medium mb-2">2. Audio Context</h4>
          <p className="mb-2">Status: 
            <span className={`ml-2 font-medium ${
              audioContextState === 'running' ? 'text-green-600' : 
              audioContextState === 'suspended' ? 'text-yellow-600' : 
              audioContextState === 'closed' || audioContextState === 'not-supported' ? 'text-red-600' : 
              'text-gray-600'
            }`}>
              {audioContextState === 'running' ? 'Running ✓' : 
               audioContextState === 'suspended' ? 'Suspended (click to resume)' : 
               audioContextState === 'closed' ? 'Closed ✗' : 
               audioContextState === 'not-supported' ? 'Not supported ✗' : 
               'Unknown'}
            </span>
          </p>
          
          {audioContextState === 'suspended' && (
            <Button 
              onClick={resumeAudioContext} 
              className="w-full"
            >
              Resume Audio Context
            </Button>
          )}
        </div>
      </div>
      
      {permissionStatus === 'granted' && (
        <>
          <div className="mb-4 p-3 bg-white rounded-lg shadow-sm">
            <h4 className="font-medium mb-2">3. Select Microphone</h4>
            
            {audioDevices.length > 0 ? (
              <select 
                value={selectedDeviceId}
                onChange={handleDeviceChange}
                className="w-full p-2 border border-gray-300 rounded mb-3"
              >
                {audioDevices.map(device => (
                  <option key={device.deviceId} value={device.deviceId}>
                    {device.label || `Microphone ${device.deviceId.substring(0, 5)}...`}
                  </option>
                ))}
              </select>
            ) : (
              <p className="text-yellow-600 mb-3">No audio devices detected</p>
            )}
            
            <div className="flex gap-3">
              <Button 
                onClick={isRecording ? stopRecording : startRecording}
                disabled={audioDevices.length === 0 || audioContextState !== 'running'}
                className={`flex-1 ${isRecording ? 'bg-red-500 hover:bg-red-600' : ''}`}
              >
                {isRecording ? 'Stop Test' : 'Test Microphone'}
              </Button>
              
              <Button 
                onClick={checkAudioReady}
                className="flex-1"
                variant="outline"
              >
                Check Audio Ready
              </Button>
            </div>
            
            {isRecording && (
              <div className="mt-3">
                <p>Volume Level: {Math.round(volumeLevel)}</p>
                <div className="w-full bg-gray-200 rounded-full h-2.5 mt-1">
                  <div 
                    className={`h-2.5 rounded-full ${
                      volumeLevel < 10 ? 'bg-red-500' : 
                      volumeLevel < 30 ? 'bg-yellow-500' : 'bg-green-500'
                    }`} 
                    style={{ width: `${Math.min(100, volumeLevel)}%` }}
                  ></div>
                </div>
                <p className="text-sm mt-1">
                  {volumeLevel < 10 ? 'Very low - Please speak louder or check your microphone' : 
                   volumeLevel < 30 ? 'Low - Try speaking a bit louder' : 
                   'Good - Your microphone is working properly'}
                </p>
              </div>
            )}
          </div>
          
          <div className="mb-4 p-3 bg-white rounded-lg shadow-sm">
            <h4 className="font-medium mb-2">4. System Information</h4>
            <p><strong>Browser:</strong> {browserInfo}</p>
            <p><strong>Audio Ready:</strong> <span className={isAudioReady ? 'text-green-600' : 'text-red-600'}>{isAudioReady ? 'Yes ✓' : 'No ✗'}</span></p>
          </div>
        </>
      )}
      
      <div className="mt-4 text-sm text-gray-600">
        <h4 className="font-medium mb-1">Audio Troubleshooting Tips:</h4>
        <ul className="list-disc pl-5 space-y-1">
          <li>Make sure your microphone is not muted in your system settings</li>
          <li>Check if the correct microphone is selected</li>
          <li>Try speaking louder or moving closer to your microphone</li>
          <li>Close other applications that might be using your microphone</li>
          <li>Try using Chrome browser for best compatibility</li>
          <li>Refresh the page if audio issues persist</li>
        </ul>
      </div>
    </div>
  );
};

export default AudioSetup;
