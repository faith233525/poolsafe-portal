import React, { Component, ErrorInfo, ReactNode } from "react";
import { logError } from "../utils/errorTracking";
import "../styles/error-handling.css";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);

    // Log error to tracking system
    logError(error, {
      errorInfo,
      userId: localStorage.getItem("userId"),
      route: window.location.pathname,
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString(),
    });

    this.setState({ errorInfo });
    this.props.onError?.(error, errorInfo);
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  private handleReload = () => {
    window.location.reload();
  };

  private handleReport = () => {
    if (this.state.error) {
      const subject = `Error Report: ${this.state.error.message}`;
      const body = `
Error Details:
- Message: ${this.state.error.message}
- Stack: ${this.state.error.stack}
- Page: ${window.location.pathname}
- Time: ${new Date().toLocaleString()}
- User Agent: ${navigator.userAgent}

Please describe what you were doing when this error occurred:
      `;

      const mailto = `mailto:support@poolsafeinc.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      window.open(mailto);
    }
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="error-boundary">
          <div className="error-boundary__container">
            <div className="error-boundary__icon">
              <svg
                width="64"
                height="64"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>

            <h2 className="error-boundary__title">Something went wrong</h2>
            <p className="error-boundary__message">
              We&apos;re sorry, but something unexpected happened. Our team has been notified.
            </p>

            {process.env.NODE_ENV === "development" && this.state.error && (
              <details className="error-boundary__details">
                <summary>Error Details (Development)</summary>
                <pre className="error-boundary__stack">
                  {this.state.error.message}
                  {this.state.error.stack}
                </pre>
              </details>
            )}

            <div className="error-boundary__actions">
              <button
                onClick={this.handleRetry}
                className="error-boundary__button error-boundary__button--primary"
              >
                Try Again
              </button>

              <button
                onClick={this.handleReload}
                className="error-boundary__button error-boundary__button--secondary"
              >
                Reload Page
              </button>

              <button
                onClick={this.handleReport}
                className="error-boundary__button error-boundary__button--outline"
              >
                Report Issue
              </button>
            </div>

            <div className="error-boundary__help">
              <p>If this problem persists, please contact our support team:</p>
              <a href="mailto:support@poolsafeinc.com" className="error-boundary__contact">
                support@poolsafeinc.com
              </a>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Higher-order component for wrapping components with error boundary
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: ReactNode,
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary fallback={fallback}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
  return WrappedComponent;
}

// Async error boundary for handling Promise rejections
export const AsyncErrorBoundary: React.FC<Props> = ({ children, ...props }) => {
  React.useEffect(() => {
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error("Unhandled promise rejection:", event.reason);
      logError(new Error(event.reason), {
        type: "unhandledRejection",
        route: window.location.pathname,
        timestamp: new Date().toISOString(),
      });
    };

    window.addEventListener("unhandledrejection", handleUnhandledRejection);
    return () => window.removeEventListener("unhandledrejection", handleUnhandledRejection);
  }, []);

  return <ErrorBoundary {...props}>{children}</ErrorBoundary>;
};

export default ErrorBoundary;
