import * as Sentry from "@sentry/react";
import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";

// Capture JWT token returned via backend SSO redirect: /dashboard?token=...
// Store it before the app renders and clean up the URL query string.
(() => {
  try {
    const url = new URL(window.location.href);
    const token = url.searchParams.get("token");
    if (token) {
      localStorage.setItem("jwt", token);
      // Remove token from the URL while preserving path and other params
      url.searchParams.delete("token");
      const newUrl = url.pathname + (url.search ? "?" + url.searchParams.toString() : "") + url.hash;
      window.history.replaceState({}, "", newUrl);
    }
  } catch {
    // no-op: fail-safe if URL parsing is unavailable
  }
})();

if (import.meta.env.DEV && !(window as any).Cypress) {
  import("./mocks/browser").then(({ worker }) => {
    worker.start();
  });
}

Sentry.init({
  dsn: "YOUR_SENTRY_DSN_HERE",
  integrations: [Sentry.browserTracingIntegration?.() ?? []].flat(),
  tracesSampleRate: 1.0,
});

createRoot(document.getElementById("root")!).render(
  <Sentry.ErrorBoundary fallback={<p>An error has occurred.</p>} showDialog>
    <App />
  </Sentry.ErrorBoundary>,
);
