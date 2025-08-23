import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  
  // Set tracesSampleRate to 1.0 to capture 100% of the transactions for performance monitoring.
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  
  // Capture 100% of the transactions for performance monitoring.
  debug: false,
  
  replaysOnErrorSampleRate: 1.0,
  replaysSessionSampleRate: 0.1,
  
  // Enable logs
  _experiments: {
    enableLogs: true,
  },
  
  integrations: [
    Sentry.replayIntegration({
      maskAllText: true,
      blockAllMedia: true,
    }),
    // Send console.log, console.warn, and console.error calls as logs to Sentry
    Sentry.consoleLoggingIntegration({ levels: ["warn", "error"] }),
  ],
  
  environment: process.env.NODE_ENV,
  
  beforeSend(event, hint) {
    // 기본적인 필터링만 수행
    try {
      if (event.request?.data && typeof event.request.data === 'object') {
        const data = event.request.data as any;
        // 민감한 정보 제거
        delete data.password;
        delete data.apiKey;
        delete data.token;
      }
    } catch (error) {
      // 에러 발생 시 원본 이벤트 반환
    }
    
    return event;
  },
});