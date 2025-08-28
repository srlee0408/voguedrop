export class UserFriendlyError extends Error {
  constructor(
    public userMessage: string,
    public technicalMessage: string,
    public code?: string
  ) {
    super(technicalMessage);
    this.name = 'UserFriendlyError';
  }
}

export const ERROR_CODES = {
  // Video Generation
  VIDEO_GENERATION_FAILED: 'VIDEO_GENERATION_FAILED',
  VIDEO_GENERATION_TIMEOUT: 'VIDEO_GENERATION_TIMEOUT',
  VIDEO_INVALID_EFFECTS: 'VIDEO_INVALID_EFFECTS',
  VIDEO_IMAGE_TOO_LARGE: 'VIDEO_IMAGE_TOO_LARGE',
  VIDEO_INVALID_FORMAT: 'VIDEO_INVALID_FORMAT',
  
  // Image Brush
  IMAGE_PROCESSING_FAILED: 'IMAGE_PROCESSING_FAILED',
  IMAGE_TOO_LARGE: 'IMAGE_TOO_LARGE',
  INVALID_IMAGE_FORMAT: 'INVALID_IMAGE_FORMAT',
  IMAGE_MASK_REQUIRED: 'IMAGE_MASK_REQUIRED',
  IMAGE_REFERENCE_REQUIRED: 'IMAGE_REFERENCE_REQUIRED',
  IMAGE_PROMPT_REQUIRED: 'IMAGE_PROMPT_REQUIRED',
  IMAGE_PROMPT_TOO_LONG: 'IMAGE_PROMPT_TOO_LONG',
  
  // Sound Generation
  SOUND_GENERATION_FAILED: 'SOUND_GENERATION_FAILED',
  SOUND_PROMPT_REQUIRED: 'SOUND_PROMPT_REQUIRED',
  SOUND_PROMPT_TOO_LONG: 'SOUND_PROMPT_TOO_LONG',
  SOUND_DURATION_INVALID: 'SOUND_DURATION_INVALID',
  
  // Common
  AUTH_REQUIRED: 'AUTH_REQUIRED',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  NETWORK_ERROR: 'NETWORK_ERROR',
  SERVER_ERROR: 'SERVER_ERROR',
  TIMEOUT_ERROR: 'TIMEOUT_ERROR',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  
  // Default
  DEFAULT: 'DEFAULT',
} as const;

export const errorMessages = {
  // Video Generation
  [ERROR_CODES.VIDEO_GENERATION_FAILED]: '영상 생성에 실패했습니다. 잠시 후 다시 시도해주세요.',
  [ERROR_CODES.VIDEO_GENERATION_TIMEOUT]: '영상 생성 시간이 초과되었습니다. 더 간단한 효과로 시도해보세요.',
  [ERROR_CODES.VIDEO_INVALID_EFFECTS]: '선택한 효과가 올바르지 않습니다. 다시 선택해주세요.',
  [ERROR_CODES.VIDEO_IMAGE_TOO_LARGE]: '이미지 크기가 너무 큽니다. 10MB 이하의 이미지를 사용해주세요.',
  [ERROR_CODES.VIDEO_INVALID_FORMAT]: '지원하지 않는 이미지 형식입니다. JPG, PNG 형식을 사용해주세요.',
  
  // Image Brush
  [ERROR_CODES.IMAGE_PROCESSING_FAILED]: '이미지 처리에 실패했습니다. 다른 이미지로 시도해주세요.',
  [ERROR_CODES.IMAGE_TOO_LARGE]: '이미지 크기가 너무 큽니다. 10MB 이하의 이미지를 사용해주세요.',
  [ERROR_CODES.INVALID_IMAGE_FORMAT]: '지원하지 않는 이미지 형식입니다. JPG, PNG 형식을 사용해주세요.',
  [ERROR_CODES.IMAGE_MASK_REQUIRED]: '마스크 이미지가 필요합니다.',
  [ERROR_CODES.IMAGE_REFERENCE_REQUIRED]: '참조 이미지가 필요합니다.',
  [ERROR_CODES.IMAGE_PROMPT_REQUIRED]: '이미지 설명이 필요합니다.',
  [ERROR_CODES.IMAGE_PROMPT_TOO_LONG]: '이미지 설명이 너무 깁니다. 500자 이내로 작성해주세요.',
  
  // Sound Generation
  [ERROR_CODES.SOUND_GENERATION_FAILED]: '사운드 생성에 실패했습니다. 설명을 수정해보세요.',
  [ERROR_CODES.SOUND_PROMPT_REQUIRED]: '사운드 설명을 입력해주세요.',
  [ERROR_CODES.SOUND_PROMPT_TOO_LONG]: '설명이 너무 깁니다. 450자 이내로 작성해주세요.',
  [ERROR_CODES.SOUND_DURATION_INVALID]: '길이는 1초에서 22초 사이여야 합니다.',
  
  // Common
  [ERROR_CODES.AUTH_REQUIRED]: '로그인이 필요한 서비스입니다.',
  [ERROR_CODES.RATE_LIMIT_EXCEEDED]: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.',
  [ERROR_CODES.NETWORK_ERROR]: '네트워크 연결을 확인해주세요.',
  [ERROR_CODES.SERVER_ERROR]: '서버에 일시적인 문제가 발생했습니다.',
  [ERROR_CODES.TIMEOUT_ERROR]: '처리 시간이 초과되었습니다. 잠시 후 다시 시도해주세요.',
  [ERROR_CODES.VALIDATION_ERROR]: '입력된 정보가 올바르지 않습니다.',
  
  // Default
  [ERROR_CODES.DEFAULT]: '작업을 처리하는 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.',
};

export function getErrorMessage(error: unknown): string {
  if (error instanceof UserFriendlyError) {
    return error.userMessage;
  }
  
  // 에러 코드로 매핑
  try {
    if (error && typeof error === 'object' && error !== null) {
      const errorObj = error as Record<string, unknown>;
      if (errorObj.code && typeof errorObj.code === 'string' && errorObj.code in errorMessages) {
        return errorMessages[errorObj.code as keyof typeof errorMessages];
      }
    }
  } catch {
    // 타입 에러 무시
  }
  
  // HTTP 상태 코드 매핑 - 간단한 접근
  let status: number | undefined;
  try {
    if (error && typeof error === 'object') {
      const errorObj = error as Record<string, unknown>;
      status = (errorObj.status as number) || 
               (errorObj.response && typeof errorObj.response === 'object' ? 
                (errorObj.response as Record<string, unknown>).status as number : undefined);
    }
  } catch {
    // 타입 에러 무시
  }
  
  if (status) {
    switch (status) {
      case 400:
        return errorMessages[ERROR_CODES.VALIDATION_ERROR];
      case 401:
        return errorMessages[ERROR_CODES.AUTH_REQUIRED];
      case 429:
        return errorMessages[ERROR_CODES.RATE_LIMIT_EXCEEDED];
      case 500:
        return errorMessages[ERROR_CODES.SERVER_ERROR];
      case 504:
        return errorMessages[ERROR_CODES.TIMEOUT_ERROR];
      default:
        return errorMessages[ERROR_CODES.DEFAULT];
    }
  }
  
  // 특정 에러 메시지 패턴 매핑
  let errorMessage = '';
  try {
    if (error && typeof error === 'object' && error !== null) {
      const errorObj = error as Record<string, unknown>;
      errorMessage = (errorObj.message as string) || (errorObj.error as string) || String(error);
    } else {
      errorMessage = String(error);
    }
  } catch {
    errorMessage = String(error);
  }
  
  const lowerMessage = errorMessage.toLowerCase();
  
  if (lowerMessage.includes('timeout') || lowerMessage.includes('timed out')) {
    return errorMessages[ERROR_CODES.TIMEOUT_ERROR];
  }
  
  if (lowerMessage.includes('network') || lowerMessage.includes('fetch')) {
    return errorMessages[ERROR_CODES.NETWORK_ERROR];
  }
  
  if (lowerMessage.includes('unauthorized') || lowerMessage.includes('authentication')) {
    return errorMessages[ERROR_CODES.AUTH_REQUIRED];
  }
  
  if (lowerMessage.includes('rate limit')) {
    return errorMessages[ERROR_CODES.RATE_LIMIT_EXCEEDED];
  }
  
  if (lowerMessage.includes('file too large') || lowerMessage.includes('image size')) {
    return errorMessages[ERROR_CODES.IMAGE_TOO_LARGE];
  }
  
  if (lowerMessage.includes('invalid image') || lowerMessage.includes('unsupported format')) {
    return errorMessages[ERROR_CODES.INVALID_IMAGE_FORMAT];
  }
  
  return errorMessages[ERROR_CODES.DEFAULT];
}

export function createUserFriendlyError(
  code: keyof typeof ERROR_CODES,
  technicalMessage?: string
): UserFriendlyError {
  return new UserFriendlyError(
    errorMessages[ERROR_CODES[code]],
    technicalMessage || errorMessages[ERROR_CODES[code]],
    ERROR_CODES[code]
  );
}