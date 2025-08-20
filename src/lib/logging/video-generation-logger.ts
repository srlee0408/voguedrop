import { createClient } from '@/shared/lib/supabase/server';

export type LogLevel = 'info' | 'warning' | 'error' | 'debug';

export interface LogMetadata {
  [key: string]: unknown;
  model_type?: 'seedance' | 'hailo';
  status_change?: {
    from: string;
    to: string;
  };
  fal_request_id?: string;
  fal_response?: unknown;
  error_details?: {
    name?: string;
    message?: string;
    stack?: string;
    code?: string;
  };
  request_data?: unknown;
  response_data?: unknown;
  duration_ms?: number;
}

export class VideoGenerationLogger {
  private jobId: string;

  constructor(jobId: string) {
    this.jobId = jobId;
  }

  /**
   * Log an info message
   */
  async info(message: string, metadata: LogMetadata = {}): Promise<void> {
    return this.log('info', message, metadata);
  }

  /**
   * Log a warning message
   */
  async warning(message: string, metadata: LogMetadata = {}): Promise<void> {
    return this.log('warning', message, metadata);
  }

  /**
   * Log an error message
   */
  async error(message: string, error?: Error, metadata: LogMetadata = {}): Promise<void> {
    const errorMetadata: LogMetadata = {
      ...metadata,
      error_details: error ? {
        name: error.name,
        message: error.message,
        stack: error.stack,
        ...metadata.error_details
      } : metadata.error_details
    };
    return this.log('error', message, errorMetadata);
  }

  /**
   * Log a debug message
   */
  async debug(message: string, metadata: LogMetadata = {}): Promise<void> {
    return this.log('debug', message, metadata);
  }

  /**
   * Log a status change
   */
  async statusChange(from: string, to: string, additionalMetadata: LogMetadata = {}): Promise<void> {
    return this.log('info', `Status changed from ${from} to ${to}`, {
      ...additionalMetadata,
      status_change: { from, to }
    });
  }

  /**
   * Log a fal.ai API request
   */
  async falApiRequest(
    endpoint: string, 
    requestData: unknown, 
    metadata: LogMetadata = {}
  ): Promise<void> {
    return this.log('info', `Sending request to fal.ai endpoint: ${endpoint}`, {
      ...metadata,
      request_data: requestData,
      endpoint
    });
  }

  /**
   * Log a fal.ai API response
   */
  async falApiResponse(
    endpoint: string, 
    responseData: unknown, 
    duration: number,
    metadata: LogMetadata = {}
  ): Promise<void> {
    return this.log('info', `Received response from fal.ai endpoint: ${endpoint}`, {
      ...metadata,
      response_data: responseData,
      endpoint,
      duration_ms: duration
    });
  }

  /**
   * Log a fal.ai API error
   */
  async falApiError(
    endpoint: string, 
    error: Error, 
    duration: number,
    metadata: LogMetadata = {}
  ): Promise<void> {
    return this.log('error', `fal.ai API error for endpoint: ${endpoint}`, error, {
      ...metadata,
      endpoint,
      duration_ms: duration
    });
  }

  /**
   * Log webhook received
   */
  async webhookReceived(payload: unknown, metadata: LogMetadata = {}): Promise<void> {
    return this.log('info', 'Webhook received from fal.ai', {
      ...metadata,
      webhook_payload: payload
    });
  }

  /**
   * Core logging method
   */
  private async log(
    level: LogLevel, 
    message: string, 
    metadata?: LogMetadata
  ): Promise<void>;
  private async log(
    level: LogLevel, 
    message: string, 
    error: Error, 
    metadata?: LogMetadata
  ): Promise<void>;
  private async log(
    level: LogLevel, 
    message: string, 
    errorOrMetadata?: Error | LogMetadata,
    metadata: LogMetadata = {}
  ): Promise<void> {
    try {
      const supabase = await createClient();
      
      // Handle overloaded parameters
      let finalMetadata: LogMetadata;
      if (errorOrMetadata instanceof Error) {
        finalMetadata = {
          ...metadata,
          error_details: {
            name: errorOrMetadata.name,
            message: errorOrMetadata.message,
            stack: errorOrMetadata.stack
          }
        };
      } else {
        finalMetadata = errorOrMetadata || {};
      }

      // Insert log entry
      const { error } = await supabase
        .from('video_generation_logs')
        .insert({
          job_id: this.jobId,
          level,
          message,
          metadata: finalMetadata,
          timestamp: new Date().toISOString()
        });

      if (error) {
        // Fallback to console logging if database insert fails
        // console.error('Failed to insert log entry:', error);
        console.log(`[${level.toUpperCase()}] ${this.jobId}: ${message}`, finalMetadata);
      }
    } catch (err) {
      // Fallback to console logging
      console.error('Video generation logger error:', err);
      console.log(`[${level.toUpperCase()}] ${this.jobId}: ${message}`, errorOrMetadata);
    }
  }
}

/**
 * Create a logger instance for a specific job
 */
export function createVideoGenerationLogger(jobId: string): VideoGenerationLogger {
  return new VideoGenerationLogger(jobId);
}

/**
 * Utility function to measure and log execution time
 */
export async function measureAndLog<T>(
  logger: VideoGenerationLogger,
  operation: string,
  fn: () => Promise<T>
): Promise<T> {
  const startTime = Date.now();
  const startMessage = `Starting ${operation}`;
  
  await logger.info(startMessage);
  
  try {
    const result = await fn();
    const duration = Date.now() - startTime;
    await logger.info(`Completed ${operation}`, { duration_ms: duration });
    return result;
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error : new Error(String(error));
    await logger.error(`Failed ${operation}`, errorMessage, { duration_ms: duration });
    throw error;
  }
}