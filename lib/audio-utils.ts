/**
 * Utility functions for handling audio in the application
 */

/**
 * Check if the browser has microphone permissions
 * @returns Promise that resolves to a boolean indicating if microphone access is granted
 */
export async function checkMicrophonePermission(): Promise<boolean> {
  try {
    // Try to get user media to check if permission is already granted
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    
    // If we get here, permission is granted - clean up the stream
    stream.getTracks().forEach(track => track.stop());
    return true;
  } catch (error) {
    console.error('Microphone permission check failed:', error);
    return false;
  }
}

/**
 * Request microphone permission from the user
 * @returns Promise that resolves to a boolean indicating if permission was granted
 */
export async function requestMicrophonePermission(): Promise<boolean> {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach(track => track.stop());
    return true;
  } catch (error) {
    console.error('Failed to get microphone permission:', error);
    return false;
  }
}

/**
 * Get available audio input devices
 * @returns Promise that resolves to an array of audio input devices
 */
export async function getAudioInputDevices(): Promise<MediaDeviceInfo[]> {
  try {
    // First ensure we have permission to enumerate devices
    await navigator.mediaDevices.getUserMedia({ audio: true })
      .then(stream => stream.getTracks().forEach(track => track.stop()));
    
    // Get all media devices
    const devices = await navigator.mediaDevices.enumerateDevices();
    
    // Filter to only audio input devices
    return devices.filter(device => device.kind === 'audioinput');
  } catch (error) {
    console.error('Failed to get audio input devices:', error);
    return [];
  }
}

/**
 * Test if audio input is working properly
 * @param deviceId Optional device ID to test
 * @returns Promise that resolves to an object with success status and volume level
 */
export async function testAudioInput(deviceId?: string): Promise<{ success: boolean, volumeLevel: number }> {
  try {
    // Request audio stream with specific device if provided
    const constraints: MediaStreamConstraints = {
      audio: deviceId ? { deviceId: { exact: deviceId } } : true
    };
    
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    
    // Create audio context to analyze volume
    const audioContext = new AudioContext();
    const analyser = audioContext.createAnalyser();
    const microphone = audioContext.createMediaStreamSource(stream);
    microphone.connect(analyser);
    
    analyser.fftSize = 256;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    
    // Get current volume level
    analyser.getByteFrequencyData(dataArray);
    const average = dataArray.reduce((acc, val) => acc + val, 0) / bufferLength;
    
    // Clean up
    stream.getTracks().forEach(track => track.stop());
    audioContext.close();
    
    return { 
      success: true, 
      volumeLevel: average 
    };
  } catch (error) {
    console.error('Audio input test failed:', error);
    return { 
      success: false, 
      volumeLevel: 0 
    };
  }
}
