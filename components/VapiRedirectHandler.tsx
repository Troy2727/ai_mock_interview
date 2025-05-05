'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { getBaseUrl } from '@/lib/vapi/config';

// Create a separate component that uses useSearchParams
function VapiRedirectHandlerInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    // Only run this once on mount
    const handleVapiRedirect = async () => {
      // Check if we have Vapi parameters in the URL
      const vapiSessionId = searchParams.get('vapi_session_id');
      const vapiStatus = searchParams.get('vapi_status');
      const redirectTo = searchParams.get('redirect_to') || '/dashboard';

      if (vapiSessionId || vapiStatus) {
        try {
          setIsProcessing(true);
          console.log('Processing Vapi redirect with parameters:', {
            vapiSessionId,
            vapiStatus,
            redirectTo
          });

          // Handle different Vapi statuses
          if (vapiStatus === 'completed') {
            toast.success('Your Vapi session was completed successfully!');

            // You could save session data to your backend here if needed
            // For example:
            // await fetch('/api/vapi/save-session', {
            //   method: 'POST',
            //   headers: { 'Content-Type': 'application/json' },
            //   body: JSON.stringify({ sessionId: vapiSessionId, status: vapiStatus })
            // });
          }
          else if (vapiStatus === 'cancelled') {
            toast.info('Your Vapi session was cancelled.');
          }
          else if (vapiStatus === 'error') {
            toast.error('There was an error with your Vapi session.');
          }

          // Redirect to the specified page without the Vapi parameters
          // This keeps the URL clean after processing
          const baseUrl = getBaseUrl();
          const cleanRedirectUrl = redirectTo.startsWith('/')
            ? `${baseUrl}${redirectTo}`
            : redirectTo;

          console.log('Redirecting to:', cleanRedirectUrl);
          router.push(redirectTo);
        }
        catch (error) {
          console.error('Error handling Vapi redirect:', error);
          toast.error('Error processing your session. Please try again.');
        }
        finally {
          setIsProcessing(false);
        }
      }
    };

    handleVapiRedirect();
  }, [router, searchParams]);

  // This component doesn't render anything visible
  return null;
}

/**
 * VapiRedirectHandler component
 *
 * This component handles redirects from Vapi workflows.
 * It should be included in your layout or on pages that need to handle Vapi redirects.
 *
 * It looks for specific URL parameters that Vapi might include in redirects:
 * - vapi_session_id: The ID of the Vapi session
 * - vapi_status: The status of the Vapi call (completed, cancelled, etc.)
 * - redirect_to: Where to redirect after processing the Vapi parameters
 */
export default function VapiRedirectHandler() {
  // Wrap the component that uses useSearchParams in a Suspense boundary
  return (
    <Suspense fallback={null}>
      <VapiRedirectHandlerInner />
    </Suspense>
  );
}
