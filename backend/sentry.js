// Sentry integration for backend (Express)
import * as Sentry from "@sentry/node";

Sentry.init({
  dsn: "<YOUR_SENTRY_DSN>", // Replace with your Sentry DSN
  tracesSampleRate: 1.0,
  environment: process.env.NODE_ENV,
});

// In your Express app (e.g., src/app.ts):
// const Sentry = require('./sentry');
// app.use(Sentry.Handlers.requestHandler());
// app.use(Sentry.Handlers.tracingHandler());
// app.use(Sentry.Handlers.errorHandler());

export default Sentry;
