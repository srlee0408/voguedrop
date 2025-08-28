import * as Sentry from "@sentry/nextjs";
import { UserFriendlyError } from '@/shared/lib/errors/user-friendly-errors';

export type ApiType = 'video_generation' | 'sound_generation' | 'image_brush';

export interface ApiCallMetadata {
  userId?: string;
  jobId?: string;
  endpoint?: string;
  requestSize?: number;
  responseSize?: number;
  [key: string]: unknown;
}

export class ApiTracker {
  static async trackApiCall<T>(
    apiType: ApiType,
    operation: string,
    metadata: ApiCallMetadata,
    apiCall: () => Promise<T>
  ): Promise<T> {
    return Sentry.startSpan(
      {
        op: `api.${apiType}`,
        name: operation,
      },
      async (span) => {
        const startTime = Date.now();
        
        // 스팬 속성 설정
        span.setAttribute('api_type', apiType);
        span.setAttribute('operation', operation);
        span.setAttribute('user_id', metadata.userId || 'unknown');
        
        if (metadata.jobId) {
          span.setAttribute('job_id', metadata.jobId);
        }
        if (metadata.endpoint) {
          span.setAttribute('endpoint', metadata.endpoint);
        }
        
        // Sentry 컨텍스트 설정
        if (metadata.userId) {
          Sentry.setUser({ id: metadata.userId });
        }

        try {
          const result = await apiCall();
          const duration = Date.now() - startTime;
          
          // 성공 시 스팬 속성 설정
          span.setAttribute('duration_ms', duration);
          span.setAttribute('success', true);
          
          // 성공 로그 (구조화된 로그)
          const { logger } = Sentry;
          logger.info(`API call completed successfully`, {
            api_type: apiType,
            operation,
            duration_ms: duration,
            user_id: metadata.userId,
            job_id: metadata.jobId,
          });
          
          return result;
        } catch (error) {
          const duration = Date.now() - startTime;
          
          // 실패 시 스팬 속성 설정
          span.setAttribute('duration_ms', duration);
          span.setAttribute('success', false);
          span.setAttribute('error_name', error instanceof Error ? error.name : 'Unknown');
          span.setAttribute('error_message', error instanceof Error ? error.message : String(error));
          
          // Sentry에 에러 전송
          Sentry.captureException(error, {
            tags: {
              api_type: apiType,
              operation: operation,
            },
            extra: {
              ...metadata,
              duration_ms: duration,
            },
            level: 'error',
          });
          
          // 에러 로그 (구조화된 로그)
          const { logger } = Sentry;
          logger.error(`API call failed`, {
            api_type: apiType,
            operation,
            duration_ms: duration,
            user_id: metadata.userId,
            job_id: metadata.jobId,
            error_name: error instanceof Error ? error.name : 'Unknown',
            error_message: error instanceof Error ? error.message : String(error),
          });
          
          // UserFriendlyError가 아닌 경우 래핑
          if (!(error instanceof UserFriendlyError)) {
            const enhancedError = new Error(error instanceof Error ? error.message : String(error));
            enhancedError.name = 'ApiCallError';
            enhancedError.stack = error instanceof Error ? error.stack : undefined;
            (enhancedError as unknown as { apiType: string }).apiType = apiType;
            (enhancedError as unknown as { operation: string }).operation = operation;
            (enhancedError as unknown as { duration: number }).duration = duration;
            throw enhancedError;
          }
          
          throw error;
        }
      }
    );
  }
  
  static async trackExternalApiCall<T>(
    apiType: ApiType,
    externalService: string,
    endpoint: string,
    metadata: ApiCallMetadata,
    apiCall: () => Promise<T>
  ): Promise<T> {
    const operation = `${externalService}_${endpoint.split('/').pop()}`;
    
    return this.trackApiCall(
      apiType,
      operation,
      {
        ...metadata,
        external_service: externalService,
        endpoint,
      },
      apiCall
    );
  }
}

export class FalAiTracker extends ApiTracker {
  static async trackFalApiCall<T>(
    apiType: ApiType,
    endpoint: string,
    metadata: ApiCallMetadata,
    apiCall: () => Promise<T>
  ): Promise<T> {
    return this.trackExternalApiCall(
      apiType,
      'fal_ai',
      endpoint,
      metadata,
      apiCall
    );
  }
}

export class SupabaseTracker extends ApiTracker {
  static async trackSupabaseCall<T>(
    operation: string,
    metadata: ApiCallMetadata,
    apiCall: () => Promise<T>
  ): Promise<T> {
    return this.trackExternalApiCall(
      'video_generation', // 기본값
      'supabase',
      operation,
      metadata,
      apiCall
    );
  }
}