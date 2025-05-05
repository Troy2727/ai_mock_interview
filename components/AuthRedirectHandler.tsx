'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { getAuth, getRedirectResult } from 'firebase/auth';
import { signIn } from '@/lib/actions/auth.action';

/**
 * Component to handle Firebase authentication redirects
 * This should be included in the layout to catch redirects from Google auth
 */
export default function AuthRedirectHandler() {
  const [isProcessing, setIsProcessing] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Only run this once on mount
    const handleRedirectResult = async () => {
      // Check if we're expecting a redirect result
      if (typeof window !== 'undefined' && localStorage.getItem('auth_redirect_pending')) {
        try {
          setIsProcessing(true);
          const auth = getAuth();
          
          // Get the redirect result
          const result = await getRedirectResult(auth);
          
          // Clear the pending flag
          localStorage.removeItem('auth_redirect_pending');
          
          if (result && result.user) {
            // We have a successful authentication
            console.log('Redirect authentication successful');
            
            // Get the ID token
            const idToken = await result.user.getIdToken();
            
            try {
              // Call the server-side sign-in function
              await signIn({ email: result.user.email!, idToken });
              toast.success('Signed in with Google successfully!');
            } catch (signInError) {
              console.error('Error during server-side sign-in:', signInError);
              
              // Create a local session as fallback
              localStorage.setItem('auth_user', JSON.stringify({
                uid: result.user.uid,
                email: result.user.email,
                displayName: result.user.displayName,
                photoURL: result.user.photoURL,
                isLocalSession: true,
              }));
              
              toast.success('Signed in with Google (local session)');
            }
            
            // Redirect to dashboard
            router.push('/dashboard');
          }
        } catch (error) {
          console.error('Error handling redirect result:', error);
          toast.error('Authentication failed. Please try again.');
        } finally {
          setIsProcessing(false);
        }
      }
    };
    
    handleRedirectResult();
  }, [router]);
  
  // This component doesn't render anything visible
  return null;
}
