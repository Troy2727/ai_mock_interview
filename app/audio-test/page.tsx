'use client';

import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

const AudioTest = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(50);
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('default');
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const sourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);
  const sinkIdRef = useRef<string>('default');

  // Load audio output devices
  const loadAudioDevices = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
        toast.error('Your browser does not support the required audio APIs');
        return;
      }
      
      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioOutputs = devices.filter(device => device.kind === 'audiooutput');
      
      setAudioDevices(audioOutputs);
      
      // Select the default device if available
      if (audioOutputs.length > 0) {
        const defaultDevice = audioOutputs.find(device => device.deviceId === 'default') || audioOutputs[0];
        setSelectedDeviceId(defaultDevice.deviceId);
        sinkIdRef.current = defaultDevice.deviceId;
      }
    } catch (error) {
      console.error('Error loading audio devices:', error);
      toast.error('Failed to load audio devices. Please check your browser settings.');
    }
  };

  // Play test sound
  const playTestSound = async () => {
    try {
      if (!audioRef.current) return;
      
      // Create audio context if it doesn't exist
      if (!audioContextRef.current) {
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        audioContextRef.current = new AudioContext();
        
        // Create gain node for volume control
        gainNodeRef.current = audioContextRef.current.createGain();
        gainNodeRef.current.gain.value = volume / 100;
        
        // Connect audio element to gain node
        sourceNodeRef.current = audioContextRef.current.createMediaElementSource(audioRef.current);
        sourceNodeRef.current.connect(gainNodeRef.current);
        gainNodeRef.current.connect(audioContextRef.current.destination);
      }
      
      // Set audio sink (output device) if supported
      if ((audioRef.current as any).setSinkId && selectedDeviceId) {
        try {
          await (audioRef.current as any).setSinkId(selectedDeviceId);
          sinkIdRef.current = selectedDeviceId;
        } catch (error) {
          console.error('Error setting audio output device:', error);
          toast.error('Failed to set audio output device. Please check your browser settings.');
        }
      }
      
      // Play the audio
      audioRef.current.currentTime = 0;
      await audioRef.current.play();
      setIsPlaying(true);
      
      // Show toast
      toast.success('Playing test sound');
    } catch (error) {
      console.error('Error playing test sound:', error);
      toast.error('Failed to play test sound. Please check your audio settings.');
    }
  };

  // Stop test sound
  const stopTestSound = () => {
    if (!audioRef.current) return;
    
    audioRef.current.pause();
    audioRef.current.currentTime = 0;
    setIsPlaying(false);
    
    toast.info('Stopped test sound');
  };

  // Handle volume change
  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseInt(e.target.value);
    setVolume(newVolume);
    
    // Update gain node if it exists
    if (gainNodeRef.current) {
      gainNodeRef.current.gain.value = newVolume / 100;
    }
  };

  // Handle device selection change
  const handleDeviceChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const deviceId = e.target.value;
    setSelectedDeviceId(deviceId);
    
    // Update audio sink if supported
    if (audioRef.current && (audioRef.current as any).setSinkId) {
      try {
        await (audioRef.current as any).setSinkId(deviceId);
        sinkIdRef.current = deviceId;
        
        // Show toast
        toast.success('Audio output device changed');
      } catch (error) {
        console.error('Error setting audio output device:', error);
        toast.error('Failed to set audio output device. Please check your browser settings.');
      }
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Audio Output Test</h1>
      
      <div className="mb-6">
        <Button onClick={loadAudioDevices} className="mb-4">
          Load Audio Output Devices
        </Button>
        
        {audioDevices.length > 0 && (
          <div className="mb-4">
            <h2 className="text-lg font-bold mb-2">Select Audio Output Device</h2>
            <select 
              value={selectedDeviceId}
              onChange={handleDeviceChange}
              className="w-full p-2 border border-gray-300 rounded mb-4"
            >
              {audioDevices.map(device => (
                <option key={device.deviceId} value={device.deviceId}>
                  {device.label || `Speaker ${device.deviceId.substring(0, 5)}...`}
                </option>
              ))}
            </select>
          </div>
        )}
        
        <div className="mb-4">
          <h2 className="text-lg font-bold mb-2">Volume</h2>
          <input 
            type="range" 
            min="0" 
            max="100" 
            value={volume} 
            onChange={handleVolumeChange}
            className="w-full"
          />
          <p className="text-right">{volume}%</p>
        </div>
        
        <div className="flex gap-4">
          <Button 
            onClick={isPlaying ? stopTestSound : playTestSound}
            className={isPlaying ? 'bg-red-500 hover:bg-red-600' : 'bg-blue-500 hover:bg-blue-600'}
          >
            {isPlaying ? 'Stop Test Sound' : 'Play Test Sound'}
          </Button>
        </div>
        
        {/* Hidden audio element */}
        <audio 
          ref={audioRef} 
          src="/test-sound.mp3" 
          onEnded={() => setIsPlaying(false)}
          loop={false}
          className="hidden"
        />
      </div>
      
      <div className="mt-8 p-4 bg-gray-100 rounded-lg">
        <h2 className="text-lg font-bold mb-2">Troubleshooting Tips</h2>
        <ul className="list-disc pl-5 space-y-2">
          <li>Make sure your speakers or headphones are properly connected</li>
          <li>Check if your audio is muted in your system settings</li>
          <li>Try selecting a different audio output device if available</li>
          <li>Adjust the volume slider to make sure it's not set too low</li>
          <li>Try using a different browser (Chrome, Firefox, Edge)</li>
          <li>Restart your browser or computer if issues persist</li>
          <li>Note: Audio output device selection is only supported in Chrome and Edge</li>
        </ul>
      </div>
    </div>
  );
};

export default AudioTest;
