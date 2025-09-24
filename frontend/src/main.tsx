import * as Sentry from "@sentry/react";
import { BrowserTracing } from "@sentry/tracing";
import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";

if (process.env.NODE_ENV === "development") {
  import("./mocks/browser").then(({ worker }) => {
    worker.start();
  });
}

Sentry.init({
  dsn: "YOUR_SENTRY_DSN_HERE",
  integrations: [new BrowserTracing()],
  tracesSampleRate: 1.0,
});

createRoot(document.getElementById("root")!).render(
  <Sentry.ErrorBoundary fallback={<p>An error has occurred.</p>} showDialog>
    <App />
  </Sentry.ErrorBoundary>
);
