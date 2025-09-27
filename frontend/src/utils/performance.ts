// Performance monitoring and optimization utilities for Pool Safe Inc Portal
// Implements Core Web Vitals tracking and performance improvements

export interface PerformanceMetrics {
  cls: number; // Cumulative Layout Shift
  fid: number; // First Input Delay
  lcp: number; // Largest Contentful Paint
  fcp: number; // First Contentful Paint
  ttfb: number; // Time to First Byte
}

export interface BundleAnalysis {
  totalSize: number;
  gzippedSize: number;
  chunks: Array<{
    name: string;
    size: number;
    modules: string[];
  }>;
}

export class PerformanceManager {
  private static instance: PerformanceManager;
  private observer: PerformanceObserver | null = null;
  private metrics: Partial<PerformanceMetrics> = {};
  private resourceTimings: PerformanceEntry[] = [];

  private constructor() {
    this.init();
  }

  public static getInstance(): PerformanceManager {
    if (!PerformanceManager.instance) {
      PerformanceManager.instance = new PerformanceManager();
    }
    return PerformanceManager.instance;
  }

  private init(): void {
    this.setupPerformanceObserver();
    this.trackCoreWebVitals();
    this.setupResourceOptimization();
    this.enableLazyLoading();
    this.optimizeImages();
  }

  // Core Web Vitals Tracking
  private setupPerformanceObserver(): void {
    if ("PerformanceObserver" in window) {
      try {
        this.observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            this.processPerformanceEntry(entry);
          }
        });

        // Observe different entry types
        this.observer.observe({ entryTypes: ["measure", "navigation"] });

        // Observe paint timings if supported
        try {
          this.observer.observe({ entryTypes: ["paint"] });
        } catch {
          console.log("[Performance] Paint timing not supported");
        }

        // Observe layout shift if supported
        try {
          this.observer.observe({ entryTypes: ["layout-shift"] });
        } catch {
          console.log("[Performance] Layout shift tracking not supported");
        }
      } catch {
        console.error("[Performance] Failed to setup PerformanceObserver");
      }
    }
  }

  private trackCoreWebVitals(): void {
    // Track LCP (Largest Contentful Paint)
    this.trackLCP();

    // Track FID (First Input Delay)
    this.trackFID();

    // Track CLS (Cumulative Layout Shift)
    this.trackCLS();
  }

  private trackLCP(): void {
    if ("PerformanceObserver" in window) {
      try {
        const lcpObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1];
          this.metrics.lcp = lastEntry.startTime;
          this.reportMetric("LCP", lastEntry.startTime);
        });

        lcpObserver.observe({ entryTypes: ["largest-contentful-paint"] });
      } catch {
        console.log("[Performance] LCP tracking not supported");
      }
    }
  }

  private trackFID(): void {
    if ("PerformanceObserver" in window) {
      try {
        const fidObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.name === "first-input") {
              const fidValue = (entry as any).processingStart - entry.startTime;
              this.metrics.fid = fidValue;
              this.reportMetric("FID", fidValue);
            }
          }
        });

        fidObserver.observe({ entryTypes: ["first-input"] });
      } catch {
        console.log("[Performance] FID tracking not supported");
      }
    }
  }

  private trackCLS(): void {
    if ("PerformanceObserver" in window) {
      try {
        let clsValue = 0;
        const clsObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (!(entry as any).hadRecentInput) {
              clsValue += (entry as any).value;
            }
          }
          this.metrics.cls = clsValue;
          this.reportMetric("CLS", clsValue);
        });

        clsObserver.observe({ entryTypes: ["layout-shift"] });
      } catch {
        console.log("[Performance] CLS tracking not supported");
      }
    }
  }

  private processPerformanceEntry(entry: PerformanceEntry): void {
    switch (entry.entryType) {
      case "paint":
        if (entry.name === "first-contentful-paint") {
          this.metrics.fcp = entry.startTime;
          this.reportMetric("FCP", entry.startTime);
        }
        break;
      case "navigation": {
        const navEntry = entry as PerformanceNavigationTiming;
        this.metrics.ttfb = navEntry.responseStart - navEntry.requestStart;
        this.reportMetric("TTFB", this.metrics.ttfb);
        break;
      }
      case "resource":
        this.resourceTimings.push(entry);
        this.analyzeResourceTiming(entry as PerformanceResourceTiming);
        break;
    }
  }

  private reportMetric(name: string, value: number): void {
    console.log(`[Performance] ${name}: ${value.toFixed(2)}ms`);

    // Send to analytics if needed
    this.sendAnalytics(name, value);

    // Show warnings for poor performance
    this.checkPerformanceThresholds(name, value);
  }

  private sendAnalytics(metric: string, value: number): void {
    // Send performance data to backend analytics
    if (navigator.sendBeacon && typeof value === "number" && !isNaN(value)) {
      const data = JSON.stringify({
        metric,
        value,
        timestamp: Date.now(),
        url: window.location.href,
        userAgent: navigator.userAgent,
      });

      navigator.sendBeacon("/api/analytics/performance", data);
    }
  }

  private checkPerformanceThresholds(metric: string, value: number): void {
    const thresholds = {
      LCP: { good: 2500, poor: 4000 },
      FID: { good: 100, poor: 300 },
      CLS: { good: 0.1, poor: 0.25 },
      FCP: { good: 1800, poor: 3000 },
      TTFB: { good: 800, poor: 1800 },
    };

    const threshold = thresholds[metric as keyof typeof thresholds];
    if (!threshold) return;

    let status = "good";
    if (value > threshold.poor) {
      status = "poor";
    } else if (value > threshold.good) {
      status = "needs-improvement";
    }

    if (status !== "good") {
      console.warn(`[Performance] ${metric} performance is ${status}: ${value}ms`);
    }
  }

  // Resource Optimization
  private setupResourceOptimization(): void {
    this.preloadCriticalResources();
    this.setupResourceHints();
    this.optimizeNetworkRequests();
  }

  private preloadCriticalResources(): void {
    const criticalResources = [
      { href: "/api/auth/me", as: "fetch", crossorigin: "anonymous" },
      { href: "/api/dashboard/stats", as: "fetch", crossorigin: "anonymous" },
    ];

    criticalResources.forEach((resource) => {
      const link = document.createElement("link");
      link.rel = "preload";
      link.href = resource.href;
      link.as = resource.as;
      if (resource.crossorigin) {
        link.crossOrigin = resource.crossorigin;
      }
      document.head.appendChild(link);
    });
  }

  private setupResourceHints(): void {
    const domains = ["fonts.googleapis.com", "fonts.gstatic.com"];

    domains.forEach((domain) => {
      const link = document.createElement("link");
      link.rel = "dns-prefetch";
      link.href = `//${domain}`;
      document.head.appendChild(link);
    });
  }

  private optimizeNetworkRequests(): void {
    // Implement request deduplication
    this.setupRequestCache();

    // Setup connection pooling hints
    this.setupConnectionOptimizations();
  }

  private setupRequestCache(): void {
    const originalFetch = window.fetch;
    const requestCache = new Map<string, Promise<Response>>();

    window.fetch = function (input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
      const url = typeof input === "string" ? input : input.toString();
      const method = init?.method || "GET";
      const cacheKey = `${method}:${url}`;

      if (method === "GET" && requestCache.has(cacheKey)) {
        return requestCache.get(cacheKey)!.then((response) => response.clone());
      }

      const request = originalFetch(input, init);

      if (method === "GET") {
        requestCache.set(
          cacheKey,
          request.then((response) => response.clone()),
        );
        // Clear cache after 30 seconds
        setTimeout(() => requestCache.delete(cacheKey), 30000);
      }

      return request;
    };
  }

  private setupConnectionOptimizations(): void {
    // Add preconnect for external services
    const preconnectDomains = ["https://api.hubspot.com"];

    preconnectDomains.forEach((domain) => {
      const link = document.createElement("link");
      link.rel = "preconnect";
      link.href = domain;
      document.head.appendChild(link);
    });
  }

  private analyzeResourceTiming(entry: PerformanceResourceTiming): void {
    const duration = entry.responseEnd - entry.startTime;

    if (duration > 1000) {
      console.warn(`[Performance] Slow resource load: ${entry.name} took ${duration.toFixed(2)}ms`);
    }

    // Track resource sizes
    if (entry.transferSize > 100000) {
      // 100KB
      console.warn(
        `[Performance] Large resource: ${entry.name} is ${(entry.transferSize / 1024).toFixed(2)}KB`,
      );
    }
  }

  // Lazy Loading Implementation
  private enableLazyLoading(): void {
    this.setupImageLazyLoading();
    this.setupComponentLazyLoading();
  }

  private setupImageLazyLoading(): void {
    if ("IntersectionObserver" in window) {
      const imageObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const img = entry.target as HTMLImageElement;
            if (img.dataset.src) {
              img.src = img.dataset.src;
              img.removeAttribute("data-src");
              imageObserver.unobserve(img);
            }
          }
        });
      });

      // Observe all images with data-src attribute
      document.querySelectorAll("img[data-src]").forEach((img) => {
        imageObserver.observe(img);
      });
    }
  }

  private setupComponentLazyLoading(): void {
    // Setup intersection observer for lazy-loaded components
    if ("IntersectionObserver" in window) {
      const componentObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              const element = entry.target as HTMLElement;
              const componentName = element.dataset.lazyComponent;

              if (componentName) {
                this.loadComponent(componentName, element);
                componentObserver.unobserve(element);
              }
            }
          });
        },
        { rootMargin: "50px" },
      );

      // Observe all lazy components
      document.querySelectorAll("[data-lazy-component]").forEach((element) => {
        componentObserver.observe(element);
      });
    }
  }

  private async loadComponent(componentName: string, _element: HTMLElement): Promise<void> {
    try {
      const _componentModule = await import(`../components/${componentName}.tsx`);
      // Component loading logic would go here
      console.log(`[Performance] Loaded component: ${componentName}`);
    } catch (error) {
      console.error(`[Performance] Failed to load component: ${componentName}`, error);
    }
  }

  // Image Optimization
  private optimizeImages(): void {
    this.setupResponsiveImages();
    this.setupWebPSupport();
    this.setupImageCompression();
  }

  private setupResponsiveImages(): void {
    const images = document.querySelectorAll("img[data-sizes]");

    images.forEach((img) => {
      const imgElement = img as HTMLImageElement;
      const baseSrc = imgElement.dataset.baseSrc;
      const sizes = JSON.parse(imgElement.dataset.sizes || "[]");

      if (baseSrc && sizes.length > 0) {
        // Create srcset for different screen sizes
        const srcset = sizes
          .map((size: any) => `${baseSrc}?w=${size.width} ${size.width}w`)
          .join(", ");
        imgElement.srcset = srcset;
        imgElement.sizes = "(max-width: 768px) 100vw, 50vw";
      }
    });
  }

  private setupWebPSupport(): void {
    const supportsWebP = this.checkWebPSupport();

    if (supportsWebP) {
      document.documentElement.classList.add("webp-supported");
    }
  }

  private checkWebPSupport(): boolean {
    const canvas = document.createElement("canvas");
    canvas.width = 1;
    canvas.height = 1;
    return canvas.toDataURL("image/webp").indexOf("webp") > -1;
  }

  private setupImageCompression(): void {
    // Add loading="lazy" to all images below the fold
    const images = document.querySelectorAll("img");
    images.forEach((img, index) => {
      if (index > 3) {
        // Skip first few images (above the fold)
        img.loading = "lazy";
      }
    });
  }

  // Public Methods

  // Get current performance metrics
  public getMetrics(): Partial<PerformanceMetrics> {
    return { ...this.metrics };
  }

  // Mark performance measurements
  public mark(name: string): void {
    if ("performance" in window && performance.mark) {
      performance.mark(name);
    }
  }

  // Measure performance between marks
  public measure(name: string, startMark: string, endMark?: string): void {
    if ("performance" in window && performance.measure) {
      try {
        performance.measure(name, startMark, endMark);
      } catch {
        console.warn("[Performance] Failed to create measure");
      }
    }
  }

  // Optimize component rendering
  public optimizeComponent(componentName: string): void {
    this.mark(`${componentName}-start`);

    // Component-specific optimizations would go here
    requestIdleCallback(() => {
      this.mark(`${componentName}-end`);
      this.measure(`${componentName}-render`, `${componentName}-start`, `${componentName}-end`);
    });
  }

  // Bundle analysis
  public async analyzeBundles(): Promise<BundleAnalysis | null> {
    try {
      const response = await fetch("/api/performance/bundles");
      return await response.json();
    } catch (error) {
      console.error("[Performance] Failed to analyze bundles:", error);
      return null;
    }
  }

  // Performance recommendations
  public getRecommendations(): string[] {
    const recommendations: string[] = [];

    if (this.metrics.lcp && this.metrics.lcp > 2500) {
      recommendations.push(
        "Consider optimizing largest contentful paint by reducing image sizes or improving server response time",
      );
    }

    if (this.metrics.cls && this.metrics.cls > 0.1) {
      recommendations.push(
        "Reduce cumulative layout shift by specifying image dimensions and avoiding dynamic content insertion",
      );
    }

    if (this.metrics.fid && this.metrics.fid > 100) {
      recommendations.push(
        "Improve first input delay by reducing JavaScript execution time and using code splitting",
      );
    }

    return recommendations;
  }

  // Cleanup
  public destroy(): void {
    if (this.observer) {
      this.observer.disconnect();
    }
  }
}

// Export singleton instance
export const performanceManager = PerformanceManager.getInstance();

// Initialize performance tracking when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    performanceManager.mark("app-start");
  });
} else {
  performanceManager.mark("app-start");
}
