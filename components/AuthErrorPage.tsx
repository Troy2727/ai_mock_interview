'use client';

import { Button } from "@/components/ui/button";
import Image from "next/image";
import Link from "next/link";

interface AuthErrorPageProps {
  error?: string;
  onRetry?: () => void;
}

export default function AuthErrorPage({ 
  error = "Authentication error occurred", 
  onRetry 
}: AuthErrorPageProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-4 text-center">
      <div className="mb-6">
        <Image 
          src="/logo.svg" 
          alt="PreWiseAI Logo" 
          width={60} 
          height={60} 
          className="mx-auto"
        />
      </div>
      
      <h1 className="text-2xl font-bold mb-2">Authentication Error</h1>
      
      <p className="text-gray-400 mb-6 max-w-md">
        {error}
      </p>
      
      <div className="flex flex-col sm:flex-row gap-4">
        {onRetry && (
          <Button 
            onClick={onRetry}
            className="btn"
          >
            Try Again
          </Button>
        )}
        
        <Link href="/sign-in">
          <Button className="btn">
            Return to Sign In
          </Button>
        </Link>
      </div>
    </div>
  );
}
