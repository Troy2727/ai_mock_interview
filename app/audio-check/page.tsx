'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import AudioSetup from '@/components/AudioSetup';
import Link from 'next/link';

const AudioCheckPage = () => {
  const [isAudioReady, setIsAudioReady] = useState(false);
  const [testResults, setTestResults] = useState<{
    browserSupport: boolean | null;
    microphoneAccess: boolean | null;
    audioContext: boolean | null;
    vapiSdk: boolean | null;
  }>({
    browserSupport: null,
    microphoneAccess: null,
    audioContext: null,
    vapiSdk: null,
  });
  
  // Test Vapi SDK
  const testVapiSdk = async () => {
    try {
      // Import Vapi SDK
      const { default: Vapi } = await import('@vapi-ai/web');
      
      // Create Vapi instance
      const token = "29470ff4-913a-4394-bff5-0d0e2828cb68";
      const vapi = new Vapi(token);
      
      // If we get here, Vapi SDK is working
      setTestResults(prev => ({ ...prev, vapiSdk: true }));
      return true;
    } catch (error) {
      console.error('Error testing Vapi SDK:', error);
      setTestResults(prev => ({ ...prev, vapiSdk: false }));
      return false;
    }
  };
  
  // Test browser support
  const testBrowserSupport = () => {
    const userAgent = navigator.userAgent.toLowerCase();
    const isChrome = userAgent.includes('chrome');
    const isFirefox = userAgent.includes('firefox');
    const isEdge = userAgent.includes('edg');
    const isSafari = userAgent.includes('safari') && !userAgent.includes('chrome');
    
    // Check for WebRTC support
    const hasWebRTC = 
      navigator.mediaDevices && 
      navigator.mediaDevices.getUserMedia && 
      window.RTCPeerConnection;
    
    // Check for AudioContext support
    const hasAudioContext = 
      window.AudioContext || (window as any).webkitAudioContext;
    
    const isSupported = (isChrome || isFirefox || isEdge || isSafari) && hasWebRTC && hasAudioContext;
    
    setTestResults(prev => ({ ...prev, browserSupport: isSupported }));
    return isSupported;
  };
  
  // Run all tests
  const runAllTests = async () => {
    const browserSupport = testBrowserSupport();
    if (!browserSupport) {
      return false;
    }
    
    const vapiSdkWorks = await testVapiSdk();
    if (!vapiSdkWorks) {
      return false;
    }
    
    return true;
  };
  
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Audio Check</h1>
      <p className="mb-6">This page helps you check if your audio setup is working correctly for the interview.</p>
      
      <div className="mb-6">
        <AudioSetup 
          onPermissionGranted={() => {
            setTestResults(prev => ({ ...prev, microphoneAccess: true }));
          }}
          onAudioReady={() => {
            setIsAudioReady(true);
            setTestResults(prev => ({ ...prev, audioContext: true }));
          }}
        />
      </div>
      
      <div className="mb-6 p-4 bg-gray-100 rounded-lg">
        <h2 className="text-lg font-bold mb-4">Additional Tests</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div className="p-3 bg-white rounded-lg shadow-sm">
            <h3 className="font-bold mb-2">Browser Support</h3>
            <p className="mb-2">Status: {
              testResults.browserSupport === null ? 'Not tested' :
              testResults.browserSupport ? 'Supported ✓' : 'Not fully supported ✗'
            }</p>
            
            <Button 
              onClick={testBrowserSupport}
              className="w-full"
            >
              Test Browser Support
            </Button>
          </div>
          
          <div className="p-3 bg-white rounded-lg shadow-sm">
            <h3 className="font-bold mb-2">Vapi SDK</h3>
            <p className="mb-2">Status: {
              testResults.vapiSdk === null ? 'Not tested' :
              testResults.vapiSdk ? 'Working ✓' : 'Not working ✗'
            }</p>
            
            <Button 
              onClick={testVapiSdk}
              className="w-full"
            >
              Test Vapi SDK
            </Button>
          </div>
        </div>
        
        <Button 
          onClick={runAllTests}
          className="w-full"
        >
          Run All Tests
        </Button>
      </div>
      
      <div className="mb-6 p-4 bg-gray-100 rounded-lg">
        <h2 className="text-lg font-bold mb-4">Test Results Summary</h2>
        
        <ul className="list-disc pl-5 space-y-2">
          <li>Browser Support: {
            testResults.browserSupport === null ? 'Not tested' :
            testResults.browserSupport ? 'Supported ✓' : 'Not fully supported ✗'
          }</li>
          <li>Microphone Access: {
            testResults.microphoneAccess === null ? 'Not tested' :
            testResults.microphoneAccess ? 'Granted ✓' : 'Denied ✗'
          }</li>
          <li>Audio Context: {
            testResults.audioContext === null ? 'Not tested' :
            testResults.audioContext ? 'Working ✓' : 'Not working ✗'
          }</li>
          <li>Vapi SDK: {
            testResults.vapiSdk === null ? 'Not tested' :
            testResults.vapiSdk ? 'Working ✓' : 'Not working ✗'
          }</li>
        </ul>
        
        <div className="mt-4">
          <p className="font-bold">
            Overall Status: {
              isAudioReady && 
              testResults.browserSupport && 
              testResults.microphoneAccess && 
              testResults.audioContext && 
              testResults.vapiSdk ? 
              'Ready for Interview ✓' : 'Not Ready for Interview ✗'
            }
          </p>
        </div>
      </div>
      
      <div className="flex justify-between">
        <Link href="/dashboard">
          <Button variant="outline">Back to Dashboard</Button>
        </Link>
        
        <Link href="/interview">
          <Button 
            disabled={!isAudioReady}
          >
            Start Interview
          </Button>
        </Link>
      </div>
    </div>
  );
};

export default AudioCheckPage;
