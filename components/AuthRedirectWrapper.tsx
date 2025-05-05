'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';

// Dynamically import the AuthRedirectHandler with no SSR
// This ensures it only runs on the client side
const AuthRedirectHandler = dynamic(
  () => import('./AuthRedirectHandler'),
  { ssr: false }
);

/**
 * Client component wrapper for AuthRedirectHandler
 * This is necessary because we can't use dynamic with ssr: false in a Server Component
 */
export default function AuthRedirectWrapper() {
  const [isMounted, setIsMounted] = useState(false);
  
  useEffect(() => {
    setIsMounted(true);
  }, []);
  
  // Only render on client-side
  if (!isMounted) {
    return null;
  }
  
  return <AuthRedirectHandler />;
}
