'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import Link from 'next/link';

const AudioTroubleshooter = () => {
  const [micPermission, setMicPermission] = useState<'unknown' | 'granted' | 'denied' | 'prompt'>('unknown');
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [isRecording, setIsRecording] = useState(false);
  const [volumeLevel, setVolumeLevel] = useState(0);
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
  const [browserInfo, setBrowserInfo] = useState<string>('');
  const [testResults, setTestResults] = useState<{
    microphoneAccess: boolean | null;
    microphoneWorks: boolean | null;
    audioContextWorks: boolean | null;
    vapiWorks: boolean | null;
  }>({
    microphoneAccess: null,
    microphoneWorks: null,
    audioContextWorks: null,
    vapiWorks: null,
  });
  
  const mediaStreamRef = useRef<MediaStream | null>(null);
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
        const result = await navigator.permissions.query({ name: 'microphone' as PermissionName });
        setMicPermission(result.state as 'granted' | 'denied' | 'prompt');
        
        if (result.state === 'granted') {
          setTestResults(prev => ({ ...prev, microphoneAccess: true }));
          loadAudioDevices();
        } else {
          setTestResults(prev => ({ ...prev, microphoneAccess: false }));
        }
      } catch (error) {
        console.error('Error checking microphone permission:', error);
        // Fallback method for browsers that don't support permissions API
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          stream.getTracks().forEach(track => track.stop());
          setMicPermission('granted');
          setTestResults(prev => ({ ...prev, microphoneAccess: true }));
          loadAudioDevices();
        } catch (mediaError) {
          console.error('Error accessing microphone:', mediaError);
          setMicPermission('denied');
          setTestResults(prev => ({ ...prev, microphoneAccess: false }));
        }
      }
    };
    
    checkPermission();
    
    // Clean up on unmount
    return () => {
      stopRecording();
    };
  }, []);
  
  // Load audio devices
  const loadAudioDevices = async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioInputs = devices.filter(device => device.kind === 'audioinput');
      
      setAudioDevices(audioInputs);
      
      if (audioInputs.length > 0) {
        const defaultDevice = audioInputs.find(device => device.deviceId === 'default') || audioInputs[0];
        setSelectedDeviceId(defaultDevice.deviceId);
      }
    } catch (error) {
      console.error('Error loading audio devices:', error);
      toast.error('Failed to load audio devices');
    }
  };
  
  // Request microphone permission
  const requestMicrophonePermission = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());
      
      setMicPermission('granted');
      setTestResults(prev => ({ ...prev, microphoneAccess: true }));
      toast.success('Microphone access granted!');
      
      loadAudioDevices();
    } catch (error) {
      console.error('Error requesting microphone permission:', error);
      setMicPermission('denied');
      setTestResults(prev => ({ ...prev, microphoneAccess: false }));
      toast.error('Microphone access denied');
    }
  };
  
  // Start recording to test microphone
  const startRecording = async () => {
    try {
      // Stop any existing recording
      stopRecording();
      
      // Create audio context
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      setAudioContext(ctx);
      setTestResults(prev => ({ ...prev, audioContextWorks: true }));
      
      // Get audio stream
      const constraints = {
        audio: {
          deviceId: selectedDeviceId ? { exact: selectedDeviceId } : undefined
        }
      };
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      mediaStreamRef.current = stream;
      
      // Create analyser
      const analyser = ctx.createAnalyser();
      analyserRef.current = analyser;
      
      // Connect stream to analyser
      const source = ctx.createMediaStreamSource(stream);
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
        const scaledVolume = average * (100 / 255);
        setVolumeLevel(scaledVolume);
        
        // Check if microphone is working
        if (scaledVolume > 5) {
          setTestResults(prev => ({ ...prev, microphoneWorks: true }));
        }
        
        // Continue measuring
        animationFrameRef.current = requestAnimationFrame(measureVolume);
      };
      
      // Start measuring
      measureVolume();
      
      setIsRecording(true);
      toast.success('Microphone test started');
    } catch (error) {
      console.error('Error starting microphone test:', error);
      setTestResults(prev => ({ ...prev, microphoneWorks: false }));
      toast.error('Failed to start microphone test');
    }
  };
  
  // Stop recording
  const stopRecording = () => {
    // Cancel animation frame
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    
    // Close audio context
    if (audioContext) {
      audioContext.close();
      setAudioContext(null);
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
  
  // Test Vapi SDK
  const testVapiSDK = async () => {
    try {
      // Import Vapi SDK
      const { default: Vapi } = await import('@vapi-ai/web');
      
      // Create Vapi instance
      const token = "29470ff4-913a-4394-bff5-0d0e2828cb68";
      const vapi = new Vapi(token);
      
      // If we get here, Vapi SDK is working
      setTestResults(prev => ({ ...prev, vapiWorks: true }));
      toast.success('Vapi SDK loaded successfully');
    } catch (error) {
      console.error('Error testing Vapi SDK:', error);
      setTestResults(prev => ({ ...prev, vapiWorks: false }));
      toast.error('Failed to load Vapi SDK');
    }
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
      <h1 className="text-2xl font-bold mb-4">Audio Troubleshooter</h1>
      
      <div className="mb-6 p-4 bg-gray-100 rounded-lg">
        <h2 className="text-lg font-bold mb-2">System Information</h2>
        <p><strong>Browser:</strong> {browserInfo}</p>
        <p><strong>Microphone Permission:</strong> {micPermission}</p>
      </div>
      
      <div className="mb-6">
        <h2 className="text-lg font-bold mb-4">Audio Tests</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div className="p-4 bg-gray-100 rounded-lg">
            <h3 className="font-bold mb-2">1. Microphone Access</h3>
            <p className="mb-2">Status: {
              testResults.microphoneAccess === null ? 'Not tested' :
              testResults.microphoneAccess ? 'Passed ✅' : 'Failed ❌'
            }</p>
            
            {micPermission !== 'granted' && (
              <Button onClick={requestMicrophonePermission} className="w-full">
                Request Microphone Permission
              </Button>
            )}
          </div>
          
          <div className="p-4 bg-gray-100 rounded-lg">
            <h3 className="font-bold mb-2">2. Audio Context</h3>
            <p className="mb-2">Status: {
              testResults.audioContextWorks === null ? 'Not tested' :
              testResults.audioContextWorks ? 'Passed ✅' : 'Failed ❌'
            }</p>
            
            <Button 
              onClick={startRecording} 
              disabled={micPermission !== 'granted' || isRecording}
              className="w-full mb-2"
            >
              Test Audio Context
            </Button>
          </div>
          
          <div className="p-4 bg-gray-100 rounded-lg">
            <h3 className="font-bold mb-2">3. Microphone Works</h3>
            <p className="mb-2">Status: {
              testResults.microphoneWorks === null ? 'Not tested' :
              testResults.microphoneWorks ? 'Passed ✅' : 'Failed ❌'
            }</p>
            
            {audioDevices.length > 0 && (
              <div className="mb-2">
                <label htmlFor="audioDevice" className="block mb-1">Select Microphone:</label>
                <select 
                  id="audioDevice"
                  value={selectedDeviceId}
                  onChange={handleDeviceChange}
                  className="w-full p-2 border border-gray-300 rounded mb-2"
                >
                  {audioDevices.map(device => (
                    <option key={device.deviceId} value={device.deviceId}>
                      {device.label || `Microphone ${device.deviceId.substring(0, 5)}...`}
                    </option>
                  ))}
                </select>
              </div>
            )}
            
            <Button 
              onClick={isRecording ? stopRecording : startRecording}
              disabled={micPermission !== 'granted'}
              className={`w-full ${isRecording ? 'bg-red-500 hover:bg-red-600' : ''}`}
            >
              {isRecording ? 'Stop Recording' : 'Start Recording'}
            </Button>
            
            {isRecording && (
              <div className="mt-2">
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
          
          <div className="p-4 bg-gray-100 rounded-lg">
            <h3 className="font-bold mb-2">4. Vapi SDK</h3>
            <p className="mb-2">Status: {
              testResults.vapiWorks === null ? 'Not tested' :
              testResults.vapiWorks ? 'Passed ✅' : 'Failed ❌'
            }</p>
            
            <Button 
              onClick={testVapiSDK} 
              className="w-full"
            >
              Test Vapi SDK
            </Button>
          </div>
        </div>
      </div>
      
      <div className="mb-6 p-4 bg-gray-100 rounded-lg">
        <h2 className="text-lg font-bold mb-2">Troubleshooting Tips</h2>
        
        <div className="mb-4">
          <h3 className="font-bold">If Microphone Access Failed:</h3>
          <ul className="list-disc pl-5">
            <li>Check your browser settings to ensure microphone access is allowed for this site</li>
            <li>Try using a different browser (Chrome is recommended)</li>
            <li>Restart your browser</li>
          </ul>
        </div>
        
        <div className="mb-4">
          <h3 className="font-bold">If Audio Context Failed:</h3>
          <ul className="list-disc pl-5">
            <li>Make sure your browser supports the Web Audio API</li>
            <li>Try using a different browser (Chrome is recommended)</li>
            <li>Check if you have any browser extensions that might be blocking audio features</li>
          </ul>
        </div>
        
        <div className="mb-4">
          <h3 className="font-bold">If Microphone Test Failed:</h3>
          <ul className="list-disc pl-5">
            <li>Make sure your microphone is properly connected</li>
            <li>Check if your microphone is muted in your system settings</li>
            <li>Try selecting a different microphone if available</li>
            <li>Speak louder or move closer to your microphone</li>
          </ul>
        </div>
        
        <div className="mb-4">
          <h3 className="font-bold">If Vapi SDK Test Failed:</h3>
          <ul className="list-disc pl-5">
            <li>Check your internet connection</li>
            <li>Make sure your browser supports all required features for Vapi</li>
            <li>Try using a different browser (Chrome is recommended)</li>
            <li>Check if you have any browser extensions that might be blocking API calls</li>
          </ul>
        </div>
      </div>
      
      <div className="flex justify-between">
        <Link href="/dashboard">
          <Button variant="outline">Back to Dashboard</Button>
        </Link>
        
        <Link href="/interview">
          <Button>Try Interview Again</Button>
        </Link>
      </div>
    </div>
  );
};

export default AudioTroubleshooter;
