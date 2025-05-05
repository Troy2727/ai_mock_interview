'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to the console
    console.error('Application error:', error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center">
      <h1 className="text-2xl font-bold mb-2">Something went wrong</h1>
      
      <p className="text-gray-400 mb-6 max-w-md">
        {error.message || 'An unexpected error occurred'}
      </p>
      
      <div className="flex flex-col sm:flex-row gap-4">
        <Button 
          onClick={reset}
          className="btn"
        >
          Try Again
        </Button>
        
        <Link href="/sign-in">
          <Button className="btn">
            Return to Sign In
          </Button>
        </Link>
        
        <Link href="/auth-debug">
          <Button variant="outline">
            Check Auth Status
          </Button>
        </Link>
      </div>
      
      <div className="mt-8 p-4 bg-gray-800 rounded text-left max-w-2xl overflow-auto">
        <h2 className="text-lg font-semibold mb-2">Error Details</h2>
        <pre className="text-xs">
          {error.stack || 'No stack trace available'}
        </pre>
      </div>
    </div>
  );
}
