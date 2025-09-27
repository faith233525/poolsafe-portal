import React, { useState, useEffect } from "react";
import { useErrorReporting } from "../utils/errorTracking";
import "../styles/error-handling.css";

interface OfflineStatusProps {
  className?: string;
}

export const OfflineStatus: React.FC<OfflineStatusProps> = ({ className }) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showMessage, setShowMessage] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowMessage(true);
      setTimeout(() => setShowMessage(false), 3000);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowMessage(true);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Show initial state if offline
    if (!navigator.onLine) {
      setShowMessage(true);
    }

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  if (!showMessage) return null;

  return (
    <div
      className={`offline-message ${isOnline ? "offline-message--online" : ""} ${className || ""}`}
    >
      <div className="offline-message__icon">
        {isOnline ? (
          <svg viewBox="0 0 16 16" fill="currentColor">
            <path d="M10.97 4.97a.75.75 0 0 1 1.07 1.05l-3.99 4.99a.75.75 0 0 1-1.08.02L4.324 8.384a.75.75 0 1 1 1.06-1.06l2.094 2.093 3.473-4.425a.267.267 0 0 1 .02-.022z" />
          </svg>
        ) : (
          <svg viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1ZM7 4a1 1 0 1 1 2 0v3a1 1 0 1 1-2 0V4ZM8 10a1 1 0 1 0 0 2 1 1 0 0 0 0-2Z" />
          </svg>
        )}
      </div>
      <p className="offline-message__text">
        {isOnline ? "Back online!" : "No internet connection"}
      </p>
    </div>
  );
};

interface ErrorToastProps {
  error: Error;
  onClose: () => void;
  onRetry?: () => void;
}

export const ErrorToast: React.FC<ErrorToastProps> = ({ error, onClose, onRetry }) => {
  const { getUserFriendlyMessage } = useErrorReporting();

  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 10000); // Auto-close after 10 seconds

    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="error-toast">
      <div className="error-toast__header">
        <h4 className="error-toast__title">Error</h4>
        <button onClick={onClose} className="error-toast__close" aria-label="Close error message">
          ×
        </button>
      </div>

      <p className="error-toast__message">{getUserFriendlyMessage(error)}</p>

      <div className="error-toast__actions">
        {onRetry && (
          <button onClick={onRetry} className="error-toast__button error-toast__button--primary">
            Try Again
          </button>
        )}
        <button onClick={onClose} className="error-toast__button">
          Dismiss
        </button>
      </div>
    </div>
  );
};

interface LoadingErrorProps {
  error: Error;
  onRetry: () => void;
  title?: string;
}

export const LoadingError: React.FC<LoadingErrorProps> = ({
  error,
  onRetry,
  title = "Failed to load",
}) => {
  const { getUserFriendlyMessage } = useErrorReporting();

  return (
    <div className="loading-error">
      <div className="loading-error__icon">
        <svg
          width="48"
          height="48"
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

      <h3 className="loading-error__title">{title}</h3>
      <p className="loading-error__message">{getUserFriendlyMessage(error)}</p>

      <button onClick={onRetry} className="loading-error__retry">
        Try Again
      </button>
    </div>
  );
};

// Hook for managing error toasts
export const useErrorToasts = () => {
  const [errors, setErrors] = useState<Array<{ id: string; error: Error; retry?: () => void }>>([]);

  const showError = (error: Error, retry?: () => void) => {
    const id = Date.now().toString();
    setErrors((prev) => [...prev, { id, error, retry }]);
  };

  const dismissError = (id: string) => {
    setErrors((prev) => prev.filter((err) => err.id !== id));
  };

  const clearAllErrors = () => {
    setErrors([]);
  };

  const ErrorToasts = () => (
    <>
      {errors.map(({ id, error, retry }) => (
        <ErrorToast key={id} error={error} onClose={() => dismissError(id)} onRetry={retry} />
      ))}
    </>
  );

  return {
    showError,
    dismissError,
    clearAllErrors,
    ErrorToasts,
    errorCount: errors.length,
  };
};

// Global error boundary for the entire app
export const GlobalErrorBoundary: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <>
      <ErrorBoundary>{children}</ErrorBoundary>
      <OfflineStatus />
    </>
  );
};

// Import ErrorBoundary for use
import ErrorBoundary from "./ErrorBoundary";

export { ErrorBoundary };
export default ErrorBoundary;
