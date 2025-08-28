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
  [ERROR_CODES.VIDEO_GENERATION_FAILED]: 'Video generation failed. Please try again later.',
  [ERROR_CODES.VIDEO_GENERATION_TIMEOUT]: 'Video generation timed out. Try using simpler effects.',
  [ERROR_CODES.VIDEO_INVALID_EFFECTS]: 'Selected effects are invalid. Please choose again.',
  [ERROR_CODES.VIDEO_IMAGE_TOO_LARGE]: 'Image size is too large. Please use images under 10MB.',
  [ERROR_CODES.VIDEO_INVALID_FORMAT]: 'Unsupported image format. Please use JPG or PNG format.',
  
  // Image Brush
  [ERROR_CODES.IMAGE_PROCESSING_FAILED]: 'Image processing failed. Please try with a different image.',
  [ERROR_CODES.IMAGE_TOO_LARGE]: 'Image size is too large. Please use images under 10MB.',
  [ERROR_CODES.INVALID_IMAGE_FORMAT]: 'Unsupported image format. Please use JPG or PNG format.',
  [ERROR_CODES.IMAGE_MASK_REQUIRED]: 'Mask image is required.',
  [ERROR_CODES.IMAGE_REFERENCE_REQUIRED]: 'Reference image is required.',
  [ERROR_CODES.IMAGE_PROMPT_REQUIRED]: 'Image description is required.',
  [ERROR_CODES.IMAGE_PROMPT_TOO_LONG]: 'Image description is too long. Please keep it under 500 characters.',
  
  // Sound Generation
  [ERROR_CODES.SOUND_GENERATION_FAILED]: 'Sound generation failed. Please try modifying the description.',
  [ERROR_CODES.SOUND_PROMPT_REQUIRED]: 'Please enter a sound description.',
  [ERROR_CODES.SOUND_PROMPT_TOO_LONG]: 'Description is too long. Please keep it under 450 characters.',
  [ERROR_CODES.SOUND_DURATION_INVALID]: 'Duration must be between 1 and 22 seconds.',
  
  // Common
  [ERROR_CODES.AUTH_REQUIRED]: 'Login is required for this service.',
  [ERROR_CODES.RATE_LIMIT_EXCEEDED]: 'Too many requests. Please try again later.',
  [ERROR_CODES.NETWORK_ERROR]: 'Please check your network connection.',
  [ERROR_CODES.SERVER_ERROR]: 'A temporary server issue has occurred.',
  [ERROR_CODES.TIMEOUT_ERROR]: 'Processing time exceeded. Please try again later.',
  [ERROR_CODES.VALIDATION_ERROR]: 'The entered information is not valid.',
  
  // Default
  [ERROR_CODES.DEFAULT]: 'An error occurred while processing. Please try again later.',
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