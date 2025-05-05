'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function AuthDebugPage() {
  const [info, setInfo] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const gatherInfo = async () => {
      try {
        // Get basic environment info
        const envInfo = {
          nodeEnv: process.env.NODE_ENV,
          baseUrl: process.env.NEXT_PUBLIC_BASE_URL,
          firebaseAuthDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
          hostname: typeof window !== 'undefined' ? window.location.hostname : 'server-side',
          protocol: typeof window !== 'undefined' ? window.location.protocol : 'server-side',
          userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'server-side',
          localStorage: typeof window !== 'undefined' ? Object.keys(localStorage) : [],
          cookiesEnabled: typeof window !== 'undefined' ? navigator.cookieEnabled : false,
        };

        // Try to import Firebase
        let firebaseInfo = {};
        try {
          const { getApps, getApp } = await import('firebase/app');
          const { getAuth } = await import('firebase/auth');
          
          const apps = getApps();
          const auth = apps.length > 0 ? getAuth(getApp()) : null;
          
          firebaseInfo = {
            appsInitialized: apps.length,
            authInitialized: !!auth,
            currentUser: auth?.currentUser ? {
              uid: auth.currentUser.uid,
              email: auth.currentUser.email,
              emailVerified: auth.currentUser.emailVerified,
              isAnonymous: auth.currentUser.isAnonymous,
              providerId: auth.currentUser.providerId,
            } : null,
          };
        } catch (error) {
          firebaseInfo = { error: String(error) };
        }

        setInfo({
          timestamp: new Date().toISOString(),
          environment: envInfo,
          firebase: firebaseInfo,
        });
      } catch (error) {
        setInfo({ error: String(error) });
      } finally {
        setLoading(false);
      }
    };

    gatherInfo();
  }, []);

  const handleTestAuth = async () => {
    try {
      setLoading(true);
      
      // Import Firebase
      const { getAuth, signInAnonymously } = await import('firebase/auth');
      const auth = getAuth();
      
      // Try anonymous sign-in as a test
      const result = await signInAnonymously(auth);
      
      setInfo(prev => ({
        ...prev,
        authTest: {
          success: true,
          user: {
            uid: result.user.uid,
            isAnonymous: result.user.isAnonymous,
          }
        }
      }));
    } catch (error: any) {
      setInfo(prev => ({
        ...prev,
        authTest: {
          success: false,
          error: error.message,
          code: error.code,
        }
      }));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Authentication Debug Page</h1>
      
      <div className="mb-4 flex space-x-4">
        <Button onClick={() => window.location.reload()} disabled={loading}>
          Refresh Info
        </Button>
        
        <Button onClick={handleTestAuth} disabled={loading}>
          Test Auth
        </Button>
        
        <Link href="/sign-in">
          <Button variant="outline">
            Back to Sign In
          </Button>
        </Link>
      </div>
      
      {loading ? (
        <div className="text-center p-4">Loading...</div>
      ) : (
        <pre className="bg-gray-800 p-4 rounded overflow-auto max-h-[70vh]">
          {JSON.stringify(info, null, 2)}
        </pre>
      )}
    </div>
  );
}
