/**
 * 통합 Generation 에러 처리
 * 사용자 친화적인 에러 메시지와 즉각적인 피드백 제공
 */

export type GenerationErrorCode = 
  | 'TIMEOUT'
  | 'RATE_LIMIT'
  | 'INVALID_INPUT'
  | 'API_ERROR'
  | 'NETWORK_ERROR'
  | 'AUTH_ERROR'
  | 'QUOTA_EXCEEDED'
  | 'WEBHOOK_TIMEOUT'
  | 'PROCESSING_FAILED'
  | 'FILE_TOO_LARGE'
  | 'UNSUPPORTED_FORMAT'
  | 'UNKNOWN_ERROR';

export interface ErrorContext {
  generationType: 'video' | 'image' | 'sound';
  jobId?: string;
  userId?: string;
  timestamp: string;
  originalError?: Error;
  httpStatus?: number;
  retryable: boolean;
  suggestedAction?: string;
}

/**
 * 커스텀 Generation 에러 클래스
 */
export class GenerationError extends Error {
  public readonly code: GenerationErrorCode;
  public readonly context: ErrorContext;
  public readonly userMessage: string;
  public readonly retryable: boolean;

  constructor(
    code: GenerationErrorCode,
    context: Partial<ErrorContext> & Pick<ErrorContext, 'generationType'>,
    userMessage?: string
  ) {
    const message = userMessage || getDefaultMessage(code, context.generationType);
    super(message);
    
    this.name = 'GenerationError';
    this.code = code;
    this.userMessage = message;
    this.retryable = context.retryable ?? isRetryableError(code);
    
    this.context = {
      timestamp: new Date().toISOString(),
      retryable: this.retryable,
      ...context
    } as ErrorContext;
  }
}

/**
 * 에러 코드별 기본 사용자 메시지
 */
function getDefaultMessage(code: GenerationErrorCode, type: 'video' | 'image' | 'sound'): string {
  const typeNames = {
    video: 'video',
    image: 'image',
    sound: 'sound'
  };
  const typeName = typeNames[type];

  switch (code) {
    case 'TIMEOUT':
      return `${typeName} generation timed out. Please try again.`;
    
    case 'RATE_LIMIT':
      return 'Too many requests. Please try again later.';
    
    case 'INVALID_INPUT':
      return 'Invalid input data. Please check your content.';
    
    case 'API_ERROR':
      return `${typeName} generation service encountered an error. Please try again later.`;
    
    case 'NETWORK_ERROR':
      return 'Please check your network connection.';
    
    case 'AUTH_ERROR':
      return 'Login required. Please sign in again.';
    
    case 'QUOTA_EXCEEDED':
      return 'Daily generation limit exceeded. Please try again tomorrow.';
    
    case 'WEBHOOK_TIMEOUT':
      return `${typeName} generation is taking longer than expected. Please wait or try again.`;
    
    case 'PROCESSING_FAILED':
      return `An error occurred during ${typeName} generation. Please try again.`;
    
    case 'FILE_TOO_LARGE':
      return 'File size is too large. Please use a smaller file.';
    
    case 'UNSUPPORTED_FORMAT':
      return 'Unsupported file format. Please use a different format.';
    
    default:
      return `An unexpected error occurred during ${typeName} generation.`;
  }
}

/**
 * 재시도 가능한 에러인지 판단
 */
function isRetryableError(code: GenerationErrorCode): boolean {
  const retryableCodes: GenerationErrorCode[] = [
    'TIMEOUT',
    'API_ERROR',
    'NETWORK_ERROR',
    'WEBHOOK_TIMEOUT',
    'PROCESSING_FAILED',
    'UNKNOWN_ERROR'
  ];
  
  return retryableCodes.includes(code);
}

/**
 * 에러 분석 및 분류
 */
export function analyzeError(
  error: unknown,
  generationType: 'video' | 'image' | 'sound',
  context: Partial<ErrorContext> = {}
): GenerationError {
  // 이미 GenerationError인 경우
  if (error instanceof GenerationError) {
    return error;
  }

  // HTTP 응답 에러 분석
  if (error && typeof error === 'object' && 'status' in error) {
    const httpStatus = (error as { status: number }).status;
    const originalError = error instanceof Error ? error : new Error(String(error));
    return analyzeHttpError(httpStatus, generationType, context, originalError);
  }

  // 일반 Error 객체 분석
  if (error instanceof Error) {
    return analyzeGeneralError(error, generationType, context);
  }

  // 문자열 에러
  if (typeof error === 'string') {
    return analyzeStringError(error, generationType, context);
  }

  // 알 수 없는 에러
  return new GenerationError('UNKNOWN_ERROR', {
    generationType,
    originalError: error instanceof Error ? error : new Error(String(error)),
    ...context
  });
}

/**
 * HTTP 상태 코드 기반 에러 분석
 */
function analyzeHttpError(
  status: number,
  generationType: 'video' | 'image' | 'sound',
  context: Partial<ErrorContext>,
  originalError: Error
): GenerationError {
  let code: GenerationErrorCode;
  let retryable = false;

  switch (true) {
    case status === 400:
      code = 'INVALID_INPUT';
      break;
    case status === 401:
      code = 'AUTH_ERROR';
      break;
    case status === 403:
      code = 'QUOTA_EXCEEDED';
      break;
    case status === 413:
      code = 'FILE_TOO_LARGE';
      break;
    case status === 429:
      code = 'RATE_LIMIT';
      retryable = true;
      break;
    case status >= 500:
      code = 'API_ERROR';
      retryable = true;
      break;
    case status === 504:
      code = 'TIMEOUT';
      retryable = true;
      break;
    default:
      code = 'API_ERROR';
      retryable = true;
      break;
  }

  return new GenerationError(code, {
    generationType,
    httpStatus: status,
    originalError,
    retryable,
    ...context
  });
}

/**
 * 일반 Error 객체 분석
 */
function analyzeGeneralError(
  error: Error,
  generationType: 'video' | 'image' | 'sound',
  context: Partial<ErrorContext>
): GenerationError {
  const message = error.message.toLowerCase();
  let code: GenerationErrorCode;

  // 메시지 패턴 매칭
  if (message.includes('timeout')) {
    code = 'TIMEOUT';
  } else if (message.includes('network') || message.includes('fetch')) {
    code = 'NETWORK_ERROR';
  } else if (message.includes('limit')) {
    code = 'QUOTA_EXCEEDED';
  } else if (message.includes('auth') || message.includes('unauthorized')) {
    code = 'AUTH_ERROR';
  } else if (message.includes('file too large')) {
    code = 'FILE_TOO_LARGE';
  } else if (message.includes('unsupported')) {
    code = 'UNSUPPORTED_FORMAT';
  } else if (message.includes('webhook')) {
    code = 'WEBHOOK_TIMEOUT';
  } else {
    code = 'PROCESSING_FAILED';
  }

  return new GenerationError(code, {
    generationType,
    originalError: error,
    ...context
  });
}

/**
 * 문자열 에러 분석
 */
function analyzeStringError(
  message: string,
  generationType: 'video' | 'image' | 'sound',
  context: Partial<ErrorContext>
): GenerationError {
  return analyzeGeneralError(new Error(message), generationType, context);
}

/**
 * 에러 로깅 및 모니터링
 */
export function logError(error: GenerationError): void {
  console.error(`[GenerationError] ${error.code}:`, {
    message: error.message,
    userMessage: error.userMessage,
    context: error.context,
    stack: error.stack
  });

  // 프로덕션 환경에서는 외부 모니터링 서비스로 전송
  if (process.env.NODE_ENV === 'production') {
    // TODO: Sentry, LogRocket 등으로 전송
    // sendToMonitoring(error);
  }
}

/**
 * 사용자에게 표시할 에러 메시지 생성
 */
export function createUserErrorMessage(error: GenerationError): {
  title: string;
  message: string;
  action?: string;
  retryable: boolean;
} {
  const typeNames = {
    video: 'Video Generation',
    image: 'Image Editing',  
    sound: 'Sound Generation'
  };

  const title = `${typeNames[error.context.generationType]} Failed`;
  
  let action: string | undefined;
  if (error.retryable) {
    action = 'Try Again';
  } else if (error.code === 'AUTH_ERROR') {
    action = 'Sign In';
  } else if (error.code === 'QUOTA_EXCEEDED') {
    action = 'Upgrade Plan';
  }

  return {
    title,
    message: error.userMessage,
    action,
    retryable: error.retryable
  };
}

/**
 * React Hook용 에러 핸들러
 */
export function useErrorHandler(generationType: 'video' | 'image' | 'sound') {
  return {
    handleError: (error: unknown, context?: Partial<ErrorContext>) => {
      const generationError = analyzeError(error, generationType, context);
      logError(generationError);
      return generationError;
    },
    
    createErrorMessage: (error: unknown) => {
      const generationError = error instanceof GenerationError 
        ? error 
        : analyzeError(error, generationType);
      return createUserErrorMessage(generationError);
    }
  };
}