'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import VapiWorkflowButton from '@/components/VapiWorkflowButton';
import { getBaseUrl, getCurrentDomain, isAuthorizedDomain } from '@/lib/vapi/config';

export default function VapiTestPage() {
  const [currentDomain, setCurrentDomain] = useState<string>('');
  const [baseUrl, setBaseUrl] = useState<string>('');
  const [isAuthorized, setIsAuthorized] = useState<boolean>(false);
  
  useEffect(() => {
    // Get the current domain and base URL for display
    if (typeof window !== 'undefined') {
      const domain = getCurrentDomain();
      setCurrentDomain(domain);
      setBaseUrl(getBaseUrl());
      setIsAuthorized(isAuthorizedDomain());
    }
  }, []);
  
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Vapi Workflow Test</h1>
      
      <div className="mb-8 p-4 bg-gray-900 rounded-lg">
        <h2 className="text-xl font-semibold mb-2">Environment Information</h2>
        <p className="mb-2">
          <span className="font-semibold">Current Domain:</span> {currentDomain}
        </p>
        <p className="mb-2">
          <span className="font-semibold">Base URL:</span> {baseUrl}
        </p>
        <p className="mb-2">
          <span className="font-semibold">Domain Authorized:</span> {isAuthorized ? 'Yes' : 'No'}
        </p>
      </div>
      
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">How This Works</h2>
        <ol className="list-decimal pl-6 space-y-2">
          <li>When you click the button below, it will start a Vapi workflow using your configured workflow ID.</li>
          <li>The workflow will be configured with a callback URL pointing to your Vercel domain.</li>
          <li>When the workflow completes, Vapi will redirect back to your Vercel domain with parameters in the URL.</li>
          <li>The VapiRedirectHandler component will process these parameters and redirect you to the dashboard.</li>
        </ol>
      </div>
      
      <div className="mb-8 p-6 bg-gray-800 rounded-lg shadow-lg">
        <h2 className="text-xl font-semibold mb-4">Start Interview</h2>
        <p className="mb-4">
          Click the button below to start a Vapi interview. Make sure you have granted microphone permissions.
        </p>
        <VapiWorkflowButton 
          buttonText="Start Interview"
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          redirectPath="/dashboard"
          variableValues={{
            username: 'Test User',
            role: 'Software Engineer'
          }}
          onSuccess={() => {
            console.log('Interview started successfully');
          }}
          onError={(error) => {
            console.error('Error starting interview:', error);
          }}
        />
      </div>
      
      <div className="mt-8 p-4 bg-yellow-900/20 rounded-lg">
        <h2 className="text-xl font-semibold mb-2 text-yellow-400">Important Notes</h2>
        <ul className="list-disc pl-6 space-y-2">
          <li>Make sure your Vapi account has your Vercel domain ({baseUrl}) added as an authorized domain.</li>
          <li>Your workflow must be configured to accept a callback URL or redirect URL parameter.</li>
          <li>You must grant microphone permissions to use Vapi voice interactions.</li>
        </ul>
      </div>
    </div>
  );
}
