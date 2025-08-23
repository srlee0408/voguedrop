import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  
  // Set tracesSampleRate to 1.0 to capture 100% of the transactions for performance monitoring.
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  
  debug: false,
  
  environment: process.env.NODE_ENV,
});