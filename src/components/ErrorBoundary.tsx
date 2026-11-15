// ============================================
// Error Boundary — Crash recovery for React components
// ============================================

import { Component, type ErrorInfo, type ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({ errorInfo });
    this.props.onError?.(error, errorInfo);
    
    // Log to console for debugging
    console.error('[ErrorBoundary] Caught error:', error);
    console.error('[ErrorBoundary] Component stack:', errorInfo.componentStack);
  }

  handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-[#1a1a2e] rounded-2xl p-6 border border-red-500/30 text-center">
            <div className="text-6xl mb-4">⚠️</div>
            <h2 className="text-xl font-bold text-white mb-2">Something went wrong</h2>
            <p className="text-gray-400 text-sm mb-4">
              An unexpected error occurred. Your data is safe — try refreshing the page.
            </p>
            
            {this.state.error && (
              <details className="mb-4 text-left">
                <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-400">
                  Error details
                </summary>
                <pre className="mt-2 text-xs text-red-400 bg-[#0f0f23] p-2 rounded overflow-auto max-h-32">
                  {this.state.error.message}
                  {this.state.errorInfo?.componentStack && (
                    `\n\n${this.state.errorInfo.componentStack}`
                  )}
                </pre>
              </details>
            )}
            
            <div className="flex gap-2">
              <button
                onClick={this.handleReset}
                className="flex-1 bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-semibold py-2 rounded-lg text-sm hover:from-indigo-600 hover:to-purple-600 transition-all"
              >
                Try Again
              </button>
              <button
                onClick={() => window.location.reload()}
                className="flex-1 bg-[#1a1a2e] border border-gray-700 text-gray-300 font-semibold py-2 rounded-lg text-sm hover:border-gray-600 transition-all"
              >
                Refresh Page
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// ============================================
// View Error Boundary — Smaller fallback for individual views
// ============================================

interface ViewErrorBoundaryProps {
  children: ReactNode;
  viewName?: string;
}

export function ViewErrorBoundary({ children, viewName }: ViewErrorBoundaryProps) {
  return (
    <ErrorBoundary
      fallback={
        <div className="p-4 max-w-lg mx-auto text-center">
          <div className="text-4xl mb-3">⚠️</div>
          <p className="text-gray-400 text-sm mb-2">
            {viewName ? `Failed to load ${viewName}` : 'Something went wrong'}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="text-xs text-indigo-400 hover:text-indigo-300"
          >
            Refresh to try again
          </button>
        </div>
      }
    >
      {children}
    </ErrorBoundary>
  );
}
