import React from "react";

// Error tracking utility for logging and monitoring errors
interface ErrorContext {
  userId?: string | null;
  route?: string;
  userAgent?: string;
  timestamp?: string;
  errorInfo?: any;
  type?: string;
  severity?: "low" | "medium" | "high" | "critical";
  tags?: string[];
  metadata?: Record<string, any>;
}

interface ErrorReport {
  id: string;
  message: string;
  stack?: string;
  context: ErrorContext;
  count: number;
  firstSeen: string;
  lastSeen: string;
}

class ErrorTracker {
  private errors: Map<string, ErrorReport> = new Map();
  private maxErrors = 100;
  private reportEndpoint = "/api/errors";

  constructor() {
    // Only attach browser globals when window/document exist
    if (typeof window !== "undefined" && typeof document !== "undefined") {
      this.setupGlobalErrorHandlers();
    }
  }

  private setupGlobalErrorHandlers() {
    // Handle JavaScript errors
    window.addEventListener("error", (event) => {
      this.logError(event.error || new Error(event.message), {
        type: "javascript",
        route: window.location.pathname,
        severity: "medium",
        metadata: {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
        },
      });
    });

    // Handle unhandled promise rejections
    window.addEventListener("unhandledrejection", (event) => {
      this.logError(new Error(event.reason || "Unhandled Promise Rejection"), {
        type: "unhandledRejection",
        route: window.location.pathname,
        severity: "high",
      });
    });

    // Handle resource loading errors
    window.addEventListener(
      "error",
      (event) => {
        if (event.target && event.target !== window) {
          const target = event.target as HTMLElement;
          this.logError(new Error(`Resource loading failed: ${target.tagName}`), {
            type: "resource",
            route: window.location.pathname,
            severity: "low",
            metadata: {
              tagName: target.tagName,
              src: (target as any).src || (target as any).href,
              outerHTML: target.outerHTML?.substring(0, 200),
            },
          });
        }
      },
      true,
    );

    // Handle network errors
    this.setupNetworkErrorHandling();
  }

  private setupNetworkErrorHandling() {
    if (typeof window === "undefined" || typeof window.fetch !== "function") {
      return;
    }
    const originalFetch = window.fetch.bind(window);
    window.fetch = async (...args) => {
      try {
        const response = await originalFetch(...(args as Parameters<typeof fetch>));
        if (!response.ok) {
          this.logError(new Error(`Network error: ${response.status} ${response.statusText}`), {
            type: "network",
            route: typeof window !== "undefined" ? window.location.pathname : undefined,
            severity: response.status >= 500 ? "high" : "medium",
            metadata: {
              url: args[0],
              status: response.status,
              statusText: response.statusText,
            },
          });
        }
        return response;
      } catch (error) {
        this.logError(error as Error, {
          type: "network",
          route: typeof window !== "undefined" ? window.location.pathname : undefined,
          severity: "high",
          metadata: {
            url: args[0],
          },
        });
        throw error;
      }
    };
  }

  public logError(error: Error, context: ErrorContext = {}) {
    const errorId = this.generateErrorId(error);
    const timestamp = new Date().toISOString();

    const enrichedContext: ErrorContext = {
      userId: typeof localStorage !== "undefined" ? localStorage.getItem("userId") : null,
      route: typeof window !== "undefined" ? window.location.pathname : undefined,
      userAgent: typeof navigator !== "undefined" ? navigator.userAgent : undefined,
      timestamp,
      ...context,
    };

    console.error("Error logged:", error, enrichedContext);

    // Update or create error report
    if (this.errors.has(errorId)) {
      const existing = this.errors.get(errorId)!;
      existing.count++;
      existing.lastSeen = timestamp;
      existing.context = { ...existing.context, ...enrichedContext };
    } else {
      const errorReport: ErrorReport = {
        id: errorId,
        message: error.message,
        stack: error.stack,
        context: enrichedContext,
        count: 1,
        firstSeen: timestamp,
        lastSeen: timestamp,
      };

      this.errors.set(errorId, errorReport);
    }

    // Maintain error limit
    if (this.errors.size > this.maxErrors) {
      const oldestKey = this.errors.keys().next().value;
      if (oldestKey) {
        this.errors.delete(oldestKey);
      }
    }

    // Send to backend (if online and not in development)
    if (
      typeof navigator !== "undefined" &&
      navigator.onLine &&
      process.env.NODE_ENV === "production"
    ) {
      this.sendErrorReport(this.errors.get(errorId)!);
    }

    // Store in localStorage for offline support
    this.storeErrorLocally(this.errors.get(errorId)!);
  }

  private generateErrorId(error: Error): string {
    const message = error.message || "Unknown error";
    const stack = error.stack || "";
    const combined = message + stack.split("\n")[1]; // Include first stack frame

    // Simple hash function
    let hash = 0;
    for (let i = 0; i < combined.length; i++) {
      const char = combined.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }

    return Math.abs(hash).toString(36);
  }

  private async sendErrorReport(errorReport: ErrorReport) {
    try {
      await fetch(this.reportEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(errorReport),
      });
    } catch (networkError) {
      console.warn("Failed to send error report:", networkError);
    }
  }

  private storeErrorLocally(errorReport: ErrorReport) {
    try {
      if (typeof localStorage === "undefined") return;
      const stored = localStorage.getItem("errorReports");
      const reports = stored ? JSON.parse(stored) : {};
      reports[errorReport.id] = errorReport;

      // Keep only last 20 errors to prevent localStorage bloat
      const sortedReports = Object.values(reports)
        .sort((a: any, b: any) => new Date(b.lastSeen).getTime() - new Date(a.lastSeen).getTime())
        .slice(0, 20);

      const trimmedReports = sortedReports.reduce((acc: any, report: any) => {
        acc[report.id] = report;
        return acc;
      }, {});

      localStorage.setItem("errorReports", JSON.stringify(trimmedReports));
    } catch (storageError) {
      console.warn("Failed to store error locally:", storageError);
    }
  }

  public getErrorReports(): ErrorReport[] {
    return Array.from(this.errors.values());
  }

  public getStoredErrors(): ErrorReport[] {
    try {
      if (typeof localStorage === "undefined") return [];
      const stored = localStorage.getItem("errorReports");
      return stored ? Object.values(JSON.parse(stored)) : [];
    } catch {
      return [];
    }
  }

  public clearErrors() {
    this.errors.clear();
    localStorage.removeItem("errorReports");
  }

  public exportErrors(): string {
    const allErrors = [...this.getErrorReports(), ...this.getStoredErrors()];
    return JSON.stringify(allErrors, null, 2);
  }

  // User-friendly error messages
  public getUserFriendlyMessage(error: Error): string {
    const message = error.message.toLowerCase();

    if (message.includes("network") || message.includes("fetch")) {
      return "Connection problem. Please check your internet connection and try again.";
    }

    if (message.includes("not found") || message.includes("404")) {
      return "The requested page or resource could not be found.";
    }

    if (message.includes("unauthorized") || message.includes("403")) {
      return "You do not have permission to access this resource.";
    }

    if (message.includes("server") || message.includes("500")) {
      return "Server error. Our team has been notified and is working on a fix.";
    }

    if (message.includes("timeout")) {
      return "The request took too long. Please try again.";
    }

    if (message.includes("cors")) {
      return "Configuration error. Please contact support.";
    }

    return "Something unexpected happened. Please try again or contact support if the problem persists.";
  }
}

// Create singleton instance
const errorTracker = new ErrorTracker();

// Export main functions
export const logError = (error: Error, context?: ErrorContext) => {
  errorTracker.logError(error, context);
};

export const getErrorReports = () => errorTracker.getErrorReports();
export const getStoredErrors = () => errorTracker.getStoredErrors();
export const clearErrors = () => errorTracker.clearErrors();
export const exportErrors = () => errorTracker.exportErrors();
export const getUserFriendlyMessage = (error: Error) => errorTracker.getUserFriendlyMessage(error);

// React hook for error reporting
export const useErrorReporting = () => {
  const reportError = React.useCallback((error: Error, context?: ErrorContext) => {
    logError(error, context);
  }, []);

  const clearAllErrors = React.useCallback(() => {
    clearErrors();
  }, []);

  const getAllErrors = React.useCallback(() => {
    return [...getErrorReports(), ...getStoredErrors()];
  }, []);

  return {
    reportError,
    clearAllErrors,
    getAllErrors,
    getUserFriendlyMessage,
  };
};

export default errorTracker;
