import { createClient } from '@/infrastructure/supabase/client';
import type { UserUploadedVideo } from '@/shared/types/database';

interface UploadVideoOptions {
  file: File;
  thumbnail?: File | null;
  metadata?: {
    duration?: number;
    aspectRatio?: string;
    width?: number;
    height?: number;
  };
  onProgress?: (progress: number) => void;
}

interface UploadResponse {
  success: boolean;
  video?: UserUploadedVideo;
  error?: string;
}

/**
 * Upload video to Supabase Edge Function
 * Supports up to 50MB file uploads, bypassing Vercel's 4.5MB limit
 */
export async function uploadVideo({
  file,
  thumbnail,
  metadata,
  onProgress
}: UploadVideoOptions): Promise<UploadResponse> {
  try {
    // Get Supabase client and session
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.access_token) {
      return {
        success: false,
        error: '로그인이 필요합니다.'
      };
    }

    // Validate file size (50MB limit for Edge Function)
    const MAX_SIZE = 50 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return {
        success: false,
        error: `파일 크기는 50MB를 초과할 수 없습니다. (현재: ${(file.size / 1024 / 1024).toFixed(2)}MB)`
      };
    }

    // Create form data
    const formData = new FormData();
    formData.append('file', file);
    
    if (thumbnail) {
      formData.append('thumbnail', thumbnail);
    }
    
    if (metadata) {
      if (metadata.duration) {
        formData.append('duration', metadata.duration.toString());
      }
      if (metadata.aspectRatio) {
        formData.append('aspectRatio', metadata.aspectRatio);
      }
      if (metadata.width) {
        formData.append('width', metadata.width.toString());
      }
      if (metadata.height) {
        formData.append('height', metadata.height.toString());
      }
    }

    // Report initial progress
    onProgress?.(10);

    // Get Edge Function URL from environment
    const functionsUrl = process.env.NEXT_PUBLIC_SUPABASE_FUNCTIONS_URL || 
                        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1`;
    
    // Upload to Edge Function with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000); // 2분 타임아웃
    
    const response = await fetch(`${functionsUrl}/upload-video`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: formData,
      signal: controller.signal,
    }).finally(() => clearTimeout(timeoutId));

    // Report upload complete
    onProgress?.(90);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Upload failed' }));
      return {
        success: false,
        error: errorData.error || `Upload failed with status ${response.status}`
      };
    }

    const data = await response.json();
    
    // Report complete
    onProgress?.(100);

    return {
      success: true,
      video: data.video
    };

  } catch (error) {
    console.error('Upload error:', error);
    
    // 타임아웃 에러 처리
    if (error instanceof Error && error.name === 'AbortError') {
      return {
        success: false,
        error: '업로드 시간이 초과되었습니다. 파일 크기를 줄이거나 네트워크 연결을 확인해주세요.'
      };
    }
    
    return {
      success: false,
      error: error instanceof Error ? error.message : '업로드 중 오류가 발생했습니다.'
    };
  }
}