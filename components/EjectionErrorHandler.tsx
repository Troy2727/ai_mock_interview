'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import { toast } from 'sonner';
import { isEjected, isHandlingEjection, setEjectionState } from '@/lib/vapi/ejection-state';
import { resetVapiInstance } from '@/lib/vapi';

interface EjectionErrorHandlerProps {
  children: React.ReactNode;
}

/**
 * Component that wraps interview components and handles ejection errors
 * by redirecting to the dashboard
 */
const EjectionErrorHandler: React.FC<EjectionErrorHandlerProps> = ({ children }) => {
  const router = useRouter();
  const [isRedirecting, setIsRedirecting] = useState(false);
  const hasRedirectedRef = useRef(false);

  // Function to handle ejection errors - defined outside useEffect to be accessible for error boundary
  const handleEjectionError = (errorMsg: string) => {
    // Check if we've already redirected
    if (hasRedirectedRef.current) return true;

    // Check if we're already handling an ejection in the global state
    if (isHandlingEjection() || isEjected()) {

      // If we haven't redirected yet, do it now
      if (!hasRedirectedRef.current) {
        console.log('EjectionErrorHandler: Global ejection state detected, redirecting to dashboard');
        hasRedirectedRef.current = true;
        setIsRedirecting(true);

        // Show toast to inform user
        toast.error('The interview was ended by the system. Redirecting to dashboard...');

        // Redirect to dashboard after a short delay
        setTimeout(() => {
          router.push('/dashboard');
        }, 2000);
      }

      return true; // Prevent default error handling
    }

    // Check for ejection error in the message
    if (
      typeof errorMsg === 'string' &&
      (errorMsg.toLowerCase().includes('meeting ended due to ejection') ||
       errorMsg.toLowerCase().includes('meeting has ended'))
    ) {
      console.log('EjectionErrorHandler: Detected normal call end signal');

      // Check if this is a normal end of conversation
      if (errorMsg.includes('assistant-ended-call-with-hangup-task') ||
          errorMsg.includes('endedReason')) {
        console.log('This is a normal end of conversation, not an error');

        // Show success toast
        toast.success('Interview completed successfully!');

        // Redirect to dashboard after a short delay
        setTimeout(() => {
          router.push('/dashboard');
        }, 2000);

        return true; // Prevent default error handling
      }

      // Otherwise, handle as an unexpected ejection
      console.log('Handling as unexpected ejection, redirecting to dashboard');
      hasRedirectedRef.current = true;
      setIsRedirecting(true);

      // Show toast to inform user
      toast.info('The interview has ended. Redirecting to dashboard...');

      try {
        // Try to stop any active Vapi calls
        if (typeof window !== 'undefined' && (window as any).__VAPI_INSTANCE__) {
          try {
            (window as any).__VAPI_INSTANCE__.stop();
            console.log('Stopped Vapi instance');
          } catch (e) {
            console.warn('Failed to stop Vapi instance:', e);
          }
        }
      } catch (e) {
        console.warn('Error accessing Vapi instance:', e);
      }

      // Update the global ejection state
      setEjectionState({
        isEjected: true,
        ejectionTime: Date.now()
      });

      // Redirect to dashboard after a short delay
      setTimeout(() => {
        router.push('/dashboard');
      }, 2000);

      return true; // Prevent default error handling
    }

    return false;
  };

  // This will catch any errors in the children components
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Check if there's already an ejection in progress when the component mounts
    if (isEjected() || isHandlingEjection()) {
      handleEjectionError('Meeting has ended');
    }

    // Store the original handlers
    const originalOnError = window.onerror;
    const originalConsoleError = console.error;

    // Create a more aggressive error handler for window.onerror
    window.onerror = (message, source, lineno, colno, error) => {
      // Skip React internal errors
      if (typeof message === 'string' && (
          message.includes('react-stack-top-frame') ||
          message.includes('react-internal') ||
          message.includes('Minified React error') ||
          message.includes('Check the render method')
      )) {
        // Let React handle its own errors
        if (originalOnError) {
          return originalOnError(message, source, lineno, colno, error);
        }
        return false;
      }

      // Check if this is a normal end of conversation
      if (typeof message === 'string' &&
          (message.includes('assistant-ended-call-with-hangup-task') ||
           message.includes('endedReason'))) {
        console.log('This is a normal end of conversation, not an error');

        // Show success toast
        toast.success('Interview completed successfully!');

        // Redirect to dashboard after a short delay
        setTimeout(() => {
          router.push('/dashboard');
        }, 2000);

        return true; // Prevent default error handling
      }

      // Check if this is an ejection error
      if (typeof message === 'string' && handleEjectionError(message)) {
        console.log('Caught ejection error in window.onerror');
        return true; // Prevent default error handling
      }

      // Otherwise, call the original handler
      if (originalOnError) {
        return originalOnError(message, source, lineno, colno, error);
      }

      return false;
    };

    // Override console.error to catch ejection errors
    console.error = function(...args) {
      // Skip React internal errors
      if (args.length > 0 && typeof args[0] === 'string' && (
          args[0].includes('react-stack-top-frame') ||
          args[0].includes('react-internal') ||
          args[0].includes('Minified React error') ||
          args[0].includes('Check the render method')
      )) {
        // Just pass through to original handler
        originalConsoleError.apply(console, args);
        return;
      }

      // Check if this is a normal end of conversation
      if (args.length > 0 && typeof args[0] === 'string' &&
          (args[0].includes('assistant-ended-call-with-hangup-task') ||
           args[0].includes('endedReason'))) {
        // Still log the message
        originalConsoleError.apply(console, args);

        console.log('This is a normal end of conversation, not an error');

        // Show success toast
        toast.success('Interview completed successfully!');

        // Redirect to dashboard after a short delay
        setTimeout(() => {
          router.push('/dashboard');
        }, 2000);

        return;
      }

      // Call the original console.error
      originalConsoleError.apply(console, args);

      // Check if this is an ejection error
      if (args.length > 0 && typeof args[0] === 'string') {
        if (handleEjectionError(args[0])) {
          console.log('Caught ejection error in console.error');
        }
      }
    };

    // Add unhandled promise rejection handler
    const unhandledRejectionHandler = (event: PromiseRejectionEvent) => {
      const errorMessage = event.reason?.message || String(event.reason);

      // Skip React internal errors
      if (typeof errorMessage === 'string' && (
          errorMessage.includes('react-stack-top-frame') ||
          errorMessage.includes('react-internal') ||
          errorMessage.includes('Minified React error') ||
          errorMessage.includes('Check the render method')
      )) {
        return; // Let React handle its own errors
      }

      // Check if this is a normal end of conversation
      if (typeof errorMessage === 'string' &&
          (errorMessage.includes('assistant-ended-call-with-hangup-task') ||
           errorMessage.includes('endedReason'))) {
        console.log('This is a normal end of conversation, not an error');

        // Show success toast
        toast.success('Interview completed successfully!');

        // Redirect to dashboard after a short delay
        setTimeout(() => {
          router.push('/dashboard');
        }, 2000);

        event.preventDefault();
        return;
      }

      if (handleEjectionError(errorMessage)) {
        console.log('Caught ejection error in unhandledrejection');
        event.preventDefault();
      }
    };

    // Add error event listener
    const errorHandler = (event: ErrorEvent) => {
      // Skip React internal errors
      if (typeof event.message === 'string' && (
          event.message.includes('react-stack-top-frame') ||
          event.message.includes('react-internal') ||
          event.message.includes('Minified React error') ||
          event.message.includes('Check the render method')
      )) {
        return; // Let React handle its own errors
      }

      // Check if this is a normal end of conversation
      if (typeof event.message === 'string' &&
          (event.message.includes('assistant-ended-call-with-hangup-task') ||
           event.message.includes('endedReason'))) {
        console.log('This is a normal end of conversation, not an error');

        // Show success toast
        toast.success('Interview completed successfully!');

        // Redirect to dashboard after a short delay
        setTimeout(() => {
          router.push('/dashboard');
        }, 2000);

        event.preventDefault();
        event.stopPropagation();
        return;
      }

      if (handleEjectionError(event.message)) {
        console.log('Caught ejection error in error event');
        event.preventDefault();
        event.stopPropagation();
      }
    };

    // Patch the Error constructor to catch ejection errors at creation time
    const OriginalError = window.Error;
    window.Error = function(message?: string) {
      // Create a proper error object
      const error = new OriginalError(message || '');

      // Only log non-React errors to reduce console noise
      if (message &&
          !message.includes('react-stack-top-frame') &&
          !message.includes('react-internal')) {
        console.log('Error created:', message);
      }

      // Skip React internal errors completely
      if (message && (
          message.includes('react-stack-top-frame') ||
          message.includes('react-internal') ||
          message.includes('Minified React error') ||
          message.includes('Check the render method')
      )) {
        return error;
      }

      // Handle speech synthesis errors specially
      if (message && message.includes('Speech error')) {
        console.log('Speech synthesis error detected, not treating as ejection');
        // Don't trigger ejection handling for speech errors
        return error;
      }

      // Check for ejection errors
      if (message &&
          (message.toLowerCase().includes('meeting ended due to ejection') ||
           message.toLowerCase().includes('meeting has ended'))) {
        console.log('Detected call end signal at Error creation:', message);

        // Check if this is a normal end of conversation
        if (message.includes('assistant-ended-call-with-hangup-task') ||
            message.includes('endedReason')) {
          console.log('This is a normal end of conversation, not an error');

          setTimeout(() => {
            // Show success toast
            toast.success('Interview completed successfully!');

            // Redirect to dashboard after a short delay
            setTimeout(() => {
              router.push('/dashboard');
            }, 2000);
          }, 0);
        } else {
          // Handle as an unexpected ejection
          console.log('Caught ejection error at Error creation:', message);

          setTimeout(() => {
            handleEjectionError(message);
          }, 0);
        }
      } else if (!message || message === '{}' || message === 'undefined' || message === '[object Object]') {
        // Handle empty error messages which might be from Vapi
        console.log('Empty or invalid error detected, might be from Vapi:', message);

        // Don't treat empty errors as ejection errors during initialization
        // This prevents false positives during the Vapi setup phase
        const isInitializing = !document.querySelector('[data-vapi-initialized="true"]');

        if (isInitializing) {
          console.log('Ignoring empty error during initialization phase');
          return error;
        }

        // Check if this is during a Vapi call
        if (typeof window !== 'undefined' && (window as any).__VAPI_INSTANCE__) {
          console.log('Error during Vapi call, treating as connection issue');

          // Try to clean up the Vapi instance
          try {
            const vapiInstance = (window as any).__VAPI_INSTANCE__;
            if (vapiInstance && typeof vapiInstance.stop === 'function') {
              console.log('Attempting to stop Vapi instance after error');
              try {
                vapiInstance.stop();
              } catch (stopError) {
                console.warn('Error stopping Vapi instance:', stopError);
              }
            }

            // Reset the Vapi instance
            if (typeof resetVapiInstance === 'function') {
              resetVapiInstance();
            } else {
              (window as any).__VAPI_INSTANCE__ = null;
            }
          } catch (cleanupError) {
            console.warn('Error cleaning up Vapi instance:', cleanupError);
          }

          // Only redirect if we're not in the initialization phase
          if (!isInitializing) {
            setTimeout(() => {
              // Redirect to dashboard with a more helpful message
              toast.error('Connection issue with the interview service. Please try again later.');
              router.push('/dashboard');
            }, 0);
          }
        }
      }

      return error;
    } as any;

    // Copy prototype and properties
    window.Error.prototype = OriginalError.prototype;
    Object.setPrototypeOf(window.Error, OriginalError);

    // Add event listeners
    window.addEventListener('unhandledrejection', unhandledRejectionHandler);
    window.addEventListener('error', errorHandler, true);

    // Set up an interval to check for the error in the DOM
    const intervalId = setInterval(() => {
      const errorElements = document.querySelectorAll('.error-message, .error, [data-error]');
      errorElements.forEach(el => {
        const text = el.textContent || '';
        if (text.toLowerCase().includes('meeting ended') || text.toLowerCase().includes('ejection')) {
          handleEjectionError(text);
        }
      });
    }, 1000);

    // Clean up
    return () => {
      window.onerror = originalOnError;
      console.error = originalConsoleError;
      window.Error = OriginalError;
      window.removeEventListener('unhandledrejection', unhandledRejectionHandler);
      window.removeEventListener('error', errorHandler, true);
      clearInterval(intervalId);
    };
  }, [router]);

  // If we're redirecting, show a loading message
  if (isRedirecting) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
        <div className="bg-gray-800 p-6 rounded-lg shadow-lg text-white">
          <h2 className="text-xl font-bold mb-4">Interview Completed</h2>
          <p>Your interview has been successfully generated.</p>
          <p className="mt-2">Redirecting to dashboard...</p>
        </div>
      </div>
    );
  }

  // Otherwise, render children with error handling
  return (
    <ErrorBoundary onError={handleEjectionError}>
      {children}
    </ErrorBoundary>
  );
};

// Simple error boundary component
class ErrorBoundary extends React.Component<{
  children: React.ReactNode;
  onError: (message: string) => boolean;
}> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    const errorMessage = error?.message || String(error);
    this.props.onError(errorMessage);
  }

  render() {
    if (this.state.hasError) {
      return null; // The parent component will handle the UI
    }

    return this.props.children;
  }
}

import React from 'react';

export default EjectionErrorHandler;
