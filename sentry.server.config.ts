import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  
  // Set tracesSampleRate to 1.0 to capture 100% of the transactions for performance monitoring.
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  
  debug: false,
  
  // Enable logs
  _experiments: {
    enableLogs: true,
  },
  
  integrations: [
    // Send console.log, console.warn, and console.error calls as logs to Sentry
    Sentry.consoleLoggingIntegration({ levels: ["warn", "error"] }),
  ],
  
  environment: process.env.NODE_ENV,
  
  beforeSend(event, hint) {
    // 서버 사이드에서 민감한 정보 필터링
    if (event.request?.data) {
      const data = event.request.data as Record<string, any>;
      
      // API 키, 토큰 등 민감한 정보 제거
      delete data.password;
      delete data.apiKey;
      delete data.token;
      delete data.fal_api_key;
      delete data.supabase_service_key;
      
      // 긴 프롬프트는 일부만 저장
      if (data.prompt && typeof data.prompt === 'string' && data.prompt.length > 200) {
        data.prompt = data.prompt.substring(0, 200) + '... (truncated)';
      }
    }
    
    // 환경 변수에서 민감한 정보 제거
    if (event.extra) {
      const sanitizedExtra = { ...event.extra };
      delete sanitizedExtra.FAL_API_KEY;
      delete sanitizedExtra.SUPABASE_SERVICE_KEY;
      delete sanitizedExtra.WEBHOOK_SECRET;
      event.extra = sanitizedExtra;
    }
    
    return event;
  },
});