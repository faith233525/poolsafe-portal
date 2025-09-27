// Sentry integration for frontend
import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: process.env.VITE_SENTRY_DSN || "<YOUR_SENTRY_DSN>", // Replace with your Sentry DSN
  integrations: [Sentry.browserTracingIntegration()],
  tracesSampleRate: 1.0,
  environment: process.env.NODE_ENV || "development",
});

// Optionally wrap your App with Sentry.ErrorBoundary in App.tsx
// <Sentry.ErrorBoundary fallback={<p>An error has occurred</p>}>...</Sentry.ErrorBoundary>
