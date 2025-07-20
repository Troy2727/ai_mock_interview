'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import VapiErrorHandler from '@/components/VapiErrorHandler';
import { getBaseUrl } from '@/lib/vapi/config';

export default function VapiDomainCheckPage() {
  const [currentDomain, setCurrentDomain] = useState<string>('');
  const [vapiToken, setVapiToken] = useState<string>('');
  const [workflowId, setWorkflowId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);
  
  useEffect(() => {
    // Get the current domain and environment variables for display
    if (typeof window !== 'undefined') {
      setCurrentDomain(window.location.hostname);
      setVapiToken(process.env.NEXT_PUBLIC_VAPI_WEB_TOKEN || '');
      setWorkflowId(process.env.NEXT_PUBLIC_VAPI_WORKFLOW_ID || '');
    }
  }, []);
  
  const testVapiConnection = async () => {
    try {
      setIsLoading(true);
      setTestResult(null);
      
      // Make a simple request to Vapi's API to check if the domain is authorized
      const response = await fetch('https://api.vapi.ai/status', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setTestResult(`Success! Vapi API is accessible from this domain. Response: ${JSON.stringify(data)}`);
        toast.success('Domain appears to be authorized with Vapi');
      } else {
        const errorText = await response.text();
        setTestResult(`Error: ${response.status} ${response.statusText}. Details: ${errorText}`);
        toast.error(`Domain authorization check failed: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.error('Error testing Vapi connection:', error);
      setTestResult(`Error: ${error instanceof Error ? error.message : String(error)}`);
      toast.error('Could not connect to Vapi API');
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Vapi Domain Authorization Check</h1>
      
      <div className="mb-8 p-4 bg-gray-900 rounded-lg">
        <h2 className="text-xl font-semibold mb-2">Environment Information</h2>
        <p className="mb-2">
          <span className="font-semibold">Current Domain:</span> {currentDomain}
        </p>
        <p className="mb-2">
          <span className="font-semibold">Base URL:</span> {getBaseUrl()}
        </p>
        <p className="mb-2">
          <span className="font-semibold">Vapi Token:</span> {vapiToken ? `${vapiToken.substring(0, 5)}...${vapiToken.substring(vapiToken.length - 5)}` : 'Not set'}
        </p>
        <p className="mb-2">
          <span className="font-semibold">Workflow ID:</span> {workflowId || 'Not set'}
        </p>
      </div>
      
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Domain Authorization Test</h2>
        <p className="mb-4">
          Click the button below to test if your domain is authorized with Vapi.
        </p>
        <button
          onClick={testVapiConnection}
          disabled={isLoading}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {isLoading ? 'Testing...' : 'Test Vapi Connection'}
        </button>
        
        {testResult && (
          <div className={`mt-4 p-4 rounded-lg ${testResult.startsWith('Success') ? 'bg-green-900/20' : 'bg-red-900/20'}`}>
            <pre className="whitespace-pre-wrap">{testResult}</pre>
          </div>
        )}
      </div>
      
      <VapiErrorHandler />
      
      <div className="mt-8 p-4 bg-yellow-900/20 rounded-lg">
        <h2 className="text-xl font-semibold mb-2 text-yellow-400">How to Fix Domain Authorization Issues</h2>
        <ol className="list-decimal pl-6 space-y-2">
          <li>Log in to your Vapi dashboard</li>
          <li>Go to Settings > Domains</li>
          <li>Add your domain: <code>{currentDomain}</code></li>
          <li>Save your changes</li>
          <li>Wait a few minutes for the changes to propagate</li>
          <li>Return to this page and test the connection again</li>
        </ol>
      </div>
    </div>
  );
}
