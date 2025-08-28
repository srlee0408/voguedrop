import { toast } from 'sonner';
import * as Sentry from "@sentry/nextjs";
import { getErrorMessage } from '@/shared/lib/errors/user-friendly-errors';

export const toastError = (error: unknown, context?: string) => {
  // 기술적 에러는 Sentry로 전송 (클라이언트 사이드에서만)
  if (typeof window !== 'undefined') {
    Sentry.captureException(error, {
      tags: { 
        context,
        source: 'toast_error'
      },
      extra: {
        errorMessage: error instanceof Error ? error.message : String(error),
        errorStack: error instanceof Error ? error.stack : undefined,
      }
    });
  }
  
  // 사용자에게는 친화적 메시지 표시
  const userMessage = getErrorMessage(error);
  
  toast.error(userMessage, {
    style: {
      background: '#dc2626',
      color: '#ffffff',
      border: '1px solid #991b1b',
      boxShadow: '0 4px 6px -1px rgba(220, 38, 38, 0.3)',
      borderRadius: '8px',
    },
    duration: 5000,
    className: 'error-toast',
  });
};

export const toastSuccess = (message: string) => {
  toast.success(message, {
    style: {
      background: '#059669',
      color: '#ffffff',
      border: '1px solid #047857',
      boxShadow: '0 4px 6px -1px rgba(5, 150, 105, 0.3)',
      borderRadius: '8px',
    },
    duration: 3000,
    className: 'success-toast',
  });
};

export const toastInfo = (message: string) => {
  toast.info(message, {
    style: {
      background: '#2563eb',
      color: '#ffffff',
      border: '1px solid #1d4ed8',
      boxShadow: '0 4px 6px -1px rgba(37, 99, 235, 0.3)',
      borderRadius: '8px',
    },
    duration: 4000,
    className: 'info-toast',
  });
};

export const toastWarning = (message: string) => {
  toast.warning(message, {
    style: {
      background: '#d97706',
      color: '#ffffff',
      border: '1px solid #b45309',
      boxShadow: '0 4px 6px -1px rgba(217, 119, 6, 0.3)',
      borderRadius: '8px',
    },
    duration: 4000,
    className: 'warning-toast',
  });
};

export const toastLoading = (message: string) => {
  return toast.loading(message, {
    style: {
      background: '#374151',
      color: '#ffffff',
      border: '1px solid #4b5563',
      borderRadius: '8px',
    },
    className: 'loading-toast',
  });
};

// API 호출 전용 토스트 유틸리티
export const apiToast = {
  error: (error: unknown, apiType?: 'video_generation' | 'sound_generation' | 'image_brush') => {
    const context = apiType ? `api_${apiType}` : 'api_call';
    toastError(error, context);
  },
  
  success: (message: string) => {
    toastSuccess(message);
  },
  
  loading: (message: string) => {
    return toastLoading(message);
  },
  
  // API 호출 성공 시 로딩 토스트를 성공으로 변경
  updateLoading: (toastId: string | number, message: string) => {
    toast.success(message, {
      id: toastId,
      style: {
        background: '#059669',
        color: '#ffffff',
        border: '1px solid #047857',
        boxShadow: '0 4px 6px -1px rgba(5, 150, 105, 0.3)',
        borderRadius: '8px',
      },
      duration: 3000,
    });
  },
  
  // API 호출 실패 시 로딩 토스트를 에러로 변경
  updateLoadingError: (toastId: string | number, error: unknown, apiType?: string) => {
    const userMessage = getErrorMessage(error);
    
    // Sentry로 에러 전송
    if (typeof window !== 'undefined') {
      Sentry.captureException(error, {
        tags: { 
          context: apiType ? `api_${apiType}` : 'api_call',
          source: 'toast_update_error'
        },
      });
    }
    
    toast.error(userMessage, {
      id: toastId,
      style: {
        background: '#dc2626',
        color: '#ffffff',
        border: '1px solid #991b1b',
        boxShadow: '0 4px 6px -1px rgba(220, 38, 38, 0.3)',
        borderRadius: '8px',
      },
      duration: 5000,
    });
  },
};