'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';

export default function MicrophonePermissionHandler() {
  const [hasMicPermission, setHasMicPermission] = useState<boolean | null>(null);

  // Check microphone permission on component mount
  useEffect(() => {
    const checkMicrophonePermission = async () => {
      try {
        // Check if the browser supports getUserMedia
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          console.error('Browser does not support getUserMedia API');
          setHasMicPermission(false);
          return;
        }

        // Try to get microphone access
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        
        // If we get here, permission was granted
        console.log('Microphone permission granted');
        setHasMicPermission(true);
        
        // Stop all tracks to release the microphone
        stream.getTracks().forEach(track => track.stop());
      } catch (error) {
        console.error('Error checking microphone permission:', error);
        setHasMicPermission(false);
        
        // Show a toast notification if permission was denied
        if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
          toast.error('Microphone access is required. Please enable it in your browser settings.');
        } else {
          toast.error('Error accessing microphone. Please check your device settings.');
        }
      }
    };

    checkMicrophonePermission();
  }, []);

  // This component doesn't render anything visible
  return null;
}
