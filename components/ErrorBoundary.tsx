'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from './ui/button';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null
    };
  }

  static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // You can log the error to an error reporting service
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render(): ReactNode {
    if (this.state.hasError) {
      // You can render any custom fallback UI
      return this.props.fallback || (
        <div className="flex flex-col items-center justify-center min-h-[50vh] p-8 text-center">
          <h2 className="text-2xl font-bold mb-4">Something went wrong</h2>
          <p className="mb-6 text-gray-600">
            We're sorry, but there was an error loading this page.
          </p>
          <div className="mb-6 p-4 bg-gray-100 rounded-md overflow-auto max-w-full">
            <pre className="text-sm text-red-500">
              {this.state.error?.toString() || 'Unknown error'}
            </pre>
          </div>
          <Button
            onClick={() => {
              this.setState({ hasError: false, error: null });
              window.location.href = '/';
            }}
          >
            Go to Home Page
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
