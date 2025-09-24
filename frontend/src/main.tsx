import * as Sentry from "@sentry/react";
import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";

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
