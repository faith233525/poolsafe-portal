import React, { Suspense, lazy, ComponentType } from "react";
import { performanceManager } from "../utils/performance";

// Loading fallback component
const LoadingSpinner: React.FC<{ message?: string }> = ({ message = "Loading..." }) => (
  <div className="loading-container" role="status" aria-live="polite">
    <div className="loading-spinner" aria-hidden="true"></div>
    <span className="loading-text">{message}</span>
  </div>
);

// Error boundary for lazy loaded components
interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

class LazyLoadErrorBoundary extends React.Component<
  React.PropsWithChildren<object>,
  ErrorBoundaryState
> {
  constructor(props: React.PropsWithChildren<object>) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Lazy component loading error:", error, errorInfo);

    // Report error to analytics
    if (navigator.sendBeacon) {
      const errorData = JSON.stringify({
        error: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        timestamp: Date.now(),
      });
      navigator.sendBeacon("/api/analytics/errors", errorData);
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-fallback" role="alert">
          <h3>Something went wrong</h3>
          <p>This component failed to load. Please try refreshing the page.</p>
          <button onClick={() => window.location.reload()} className="retry-button">
            Retry
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

// Lazy loading wrapper with performance tracking
export function createLazyComponent<T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  componentName: string,
  loadingMessage?: string,
): React.ComponentType<React.ComponentProps<T>> {
  const LazyComponent = lazy(() => {
    performanceManager.mark(`${componentName}-load-start`);

    return importFn().then((module) => {
      performanceManager.mark(`${componentName}-load-end`);
      performanceManager.measure(
        `${componentName}-load`,
        `${componentName}-load-start`,
        `${componentName}-load-end`,
      );

      console.log(`[Performance] Lazy loaded: ${componentName}`);
      return module;
    });
  });

  return React.forwardRef<any, React.ComponentProps<T>>((props, ref) => (
    <LazyLoadErrorBoundary>
      <Suspense fallback={<LoadingSpinner message={loadingMessage} />}>
        <LazyComponent {...(props as any)} ref={ref} />
      </Suspense>
    </LazyLoadErrorBoundary>
  ));
}

// Hook for intersection-based lazy loading
export function useIntersectionLazyLoad(
  ref: React.RefObject<HTMLElement>,
  options: IntersectionObserverInit = {},
): boolean {
  const [isVisible, setIsVisible] = React.useState(false);

  React.useEffect(() => {
    if (!ref.current || isVisible) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      {
        rootMargin: "50px",
        threshold: 0.1,
        ...options,
      },
    );

    observer.observe(ref.current);

    return () => observer.disconnect();
  }, [ref, isVisible, options]);

  return isVisible;
}

// Hook for image lazy loading with performance tracking
export function useImageLazyLoad(src: string): {
  imgRef: React.RefObject<HTMLImageElement>;
  isLoaded: boolean;
  hasError: boolean;
} {
  const imgRef = React.useRef<HTMLImageElement>(null);
  const [isLoaded, setIsLoaded] = React.useState(false);
  const [hasError, setHasError] = React.useState(false);
  const isVisible = useIntersectionLazyLoad(imgRef);

  React.useEffect(() => {
    if (!isVisible || !imgRef.current) return;

    const img = imgRef.current;

    const handleLoad = () => {
      setIsLoaded(true);
      performanceManager.mark(`image-loaded-${src}`);
    };

    const handleError = () => {
      setHasError(true);
      console.warn(`[Performance] Failed to load image: ${src}`);
    };

    img.addEventListener("load", handleLoad);
    img.addEventListener("error", handleError);

    // Set src to trigger loading
    if (img.dataset.src) {
      img.src = img.dataset.src;
    }

    return () => {
      img.removeEventListener("load", handleLoad);
      img.removeEventListener("error", handleError);
    };
  }, [isVisible, src]);

  return { imgRef, isLoaded, hasError };
}

// Preload component for critical resources
export const ResourcePreloader: React.FC<{
  resources: Array<{ href: string; as: string; type?: string; crossorigin?: string }>;
}> = ({ resources }) => {
  React.useEffect(() => {
    resources.forEach((resource) => {
      const link = document.createElement("link");
      link.rel = "preload";
      link.href = resource.href;
      link.as = resource.as;

      if (resource.type) {
        link.type = resource.type;
      }

      if (resource.crossorigin) {
        link.crossOrigin = resource.crossorigin;
      }

      document.head.appendChild(link);

      // Clean up on unmount
      return () => {
        if (document.head.contains(link)) {
          document.head.removeChild(link);
        }
      };
    });
  }, [resources]);

  return null;
};

// Performance monitoring component
export const PerformanceMonitor: React.FC<{ componentName: string }> = ({ componentName }) => {
  React.useEffect(() => {
    performanceManager.mark(`${componentName}-mount`);
    performanceManager.optimizeComponent(componentName);

    return () => {
      performanceManager.mark(`${componentName}-unmount`);
      performanceManager.measure(
        `${componentName}-lifetime`,
        `${componentName}-mount`,
        `${componentName}-unmount`,
      );
    };
  }, [componentName]);

  return null;
};

// Bundle analyzer component for development
export const BundleAnalyzer: React.FC = () => {
  const [analysis, setAnalysis] = React.useState<any>(null);

  React.useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      performanceManager.analyzeBundles().then(setAnalysis);
    }
  }, []);

  if (process.env.NODE_ENV !== "development" || !analysis) {
    return null;
  }

  return (
    <div className="bundle-analysis">
      <h3>Bundle Analysis</h3>
      <pre>{JSON.stringify(analysis, null, 2)}</pre>
    </div>
  );
};

export default {
  createLazyComponent,
  useIntersectionLazyLoad,
  useImageLazyLoad,
  ResourcePreloader,
  PerformanceMonitor,
  BundleAnalyzer,
};
