'use client';

import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body>
        <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center">
          <h1 className="text-2xl font-bold mb-2">Critical Error</h1>
          
          <p className="text-gray-400 mb-6 max-w-md">
            {error.message || 'A critical error occurred in the application'}
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4">
            <Button 
              onClick={reset}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Try Again
            </Button>
            
            <Link href="/sign-in">
              <Button className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700">
                Return to Sign In
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
      </body>
    </html>
  );
}
