import { useMutation, useQueryClient } from '@tanstack/react-query';
import { UserUploadedVideo } from '@/shared/types/video-editor';
import { libraryQueryKeys, type LibraryData } from './useLibraryQuery';

// 업로드 파라미터 타입
interface UploadVideoParams {
  file: File;
}

// 업로드 응답 타입
interface UploadVideoResponse {
  success: boolean;
  video: UserUploadedVideo & { url?: string };
}

// API 함수들
const uploadVideo = async ({ file }: UploadVideoParams): Promise<UserUploadedVideo> => {
  const formData = new FormData();
  formData.append('file', file);
  
  const response = await fetch('/api/upload/video', {
    method: 'POST',
    body: formData,
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Upload failed');
  }
  
  const data: UploadVideoResponse = await response.json();
  
  if (data.success && data.video) {
    return data.video;
  }
  
  throw new Error('Upload response format error');
};

const deleteUploadedVideo = async (videoId: string): Promise<void> => {
  const response = await fetch(`/api/upload/video?id=${videoId}`, {
    method: 'DELETE',
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Delete failed');
  }
};

// Progress tracking을 위한 타입
interface UploadProgress {
  progress: number;
  status: 'uploading' | 'completed' | 'error';
  error?: string;
}

// Upload Progress Query Keys
const uploadProgressKeys = {
  progress: (fileId: string) => ['uploadProgress', fileId] as const,
};

/**
 * 비디오 업로드를 위한 Mutation Hook
 * PROJECT_GUIDE.md에 따라 Optimistic Updates와 Progress tracking 지원
 */
export function useUploadVideo() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: uploadVideo,
    onMutate: async ({ file }) => {
      // 업로드 시작 시 progress tracking 시작
      const fileId = `${file.name}-${Date.now()}`;
      
      queryClient.setQueryData(uploadProgressKeys.progress(fileId), {
        progress: 0,
        status: 'uploading',
      } as UploadProgress);
      
      return { fileId };
    },
    onSuccess: (newVideo, variables, context) => {
      // uploads 쿼리 업데이트 (Optimistic Update)
      queryClient.setQueryData(
        libraryQueryKeys.uploads(),
        (oldData: UserUploadedVideo[] | undefined) => {
          if (!oldData) return [newVideo];
          return [newVideo, ...oldData];
        }
      );
      
      // combined 쿼리 업데이트
      queryClient.setQueryData(
        libraryQueryKeys.combined(),
        (oldData: LibraryData | undefined) => {
          if (!oldData) return undefined;
          return {
            ...oldData,
            uploads: [newVideo, ...oldData.uploads],
            counts: {
              ...oldData.counts,
              uploads: oldData.counts.uploads + 1
            }
          };
        }
      );
      
      // Progress 완료 처리
      if (context?.fileId) {
        queryClient.setQueryData(uploadProgressKeys.progress(context.fileId), {
          progress: 100,
          status: 'completed',
        } as UploadProgress);
        
        // 3초 후 progress 데이터 제거
        setTimeout(() => {
          queryClient.removeQueries({ 
            queryKey: uploadProgressKeys.progress(context.fileId) 
          });
        }, 3000);
      }
    },
    onError: (error, variables, context) => {
      console.error('Video upload failed:', error);
      
      // Progress 에러 처리
      if (context?.fileId) {
        queryClient.setQueryData(uploadProgressKeys.progress(context.fileId), {
          progress: 0,
          status: 'error',
          error: error.message,
        } as UploadProgress);
      }
    },
  });
}

/**
 * 업로드된 비디오 삭제를 위한 Mutation Hook
 */
export function useDeleteUploadedVideo() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: deleteUploadedVideo,
    onMutate: async (videoId) => {
      // 삭제하기 전에 캐시 업데이트 (Optimistic Update)
      await queryClient.cancelQueries({ 
        queryKey: libraryQueryKeys.uploads() 
      });
      
      const previousUploads = queryClient.getQueryData(libraryQueryKeys.uploads());
      const previousCombined = queryClient.getQueryData(libraryQueryKeys.combined());
      
      // uploads 쿼리에서 삭제할 아이템 제거
      queryClient.setQueryData(
        libraryQueryKeys.uploads(),
        (oldData: UserUploadedVideo[] | undefined) => {
          if (!oldData) return [];
          return oldData.filter(video => video.id.toString() !== videoId);
        }
      );
      
      // combined 쿼리에서 삭제할 아이템 제거
      queryClient.setQueryData(
        libraryQueryKeys.combined(),
        (oldData: LibraryData | undefined) => {
          if (!oldData) return undefined;
          const filteredUploads = oldData.uploads.filter(video => video.id.toString() !== videoId);
          return {
            ...oldData,
            uploads: filteredUploads,
            counts: {
              ...oldData.counts,
              uploads: filteredUploads.length
            }
          };
        }
      );
      
      return { previousUploads, previousCombined };
    },
    onError: (error, videoId, context) => {
      // 에러 발생 시 이전 데이터로 롤백
      if (context?.previousUploads) {
        queryClient.setQueryData(
          libraryQueryKeys.uploads(),
          context.previousUploads
        );
      }
      
      if (context?.previousCombined) {
        queryClient.setQueryData(
          libraryQueryKeys.combined(),
          context.previousCombined
        );
      }
      
      console.error('Video deletion failed:', error);
    },
    onSettled: () => {
      // 성공/실패 관계없이 최종적으로 서버에서 최신 데이터 가져오기
      queryClient.invalidateQueries({ 
        queryKey: libraryQueryKeys.all 
      });
    },
  });
}

/**
 * 업로드 진행률 추적을 위한 Hook
 */
export function useUploadProgress(fileId: string) {
  const queryClient = useQueryClient();
  
  return {
    progress: queryClient.getQueryData(uploadProgressKeys.progress(fileId)) as UploadProgress | undefined,
    setProgress: (progress: number) => {
      queryClient.setQueryData(uploadProgressKeys.progress(fileId), (oldData: UploadProgress | undefined) => ({
        progress,
        status: 'uploading' as const,
        error: oldData?.error
      }));
    },
    setError: (error: string) => {
      queryClient.setQueryData(uploadProgressKeys.progress(fileId), {
        progress: 0,
        status: 'error' as const,
        error
      });
    },
    complete: () => {
      queryClient.setQueryData(uploadProgressKeys.progress(fileId), {
        progress: 100,
        status: 'completed' as const
      });
    },
    cleanup: () => {
      queryClient.removeQueries({ 
        queryKey: uploadProgressKeys.progress(fileId) 
      });
    }
  };
}

/**
 * 다중 파일 업로드를 위한 Hook
 */
export function useBatchUploadVideos() {
  const uploadMutation = useUploadVideo();
  
  const uploadMultipleFiles = async (files: File[]): Promise<UserUploadedVideo[]> => {
    const results: UserUploadedVideo[] = [];
    
    // 순차적 업로드 (동시 업로드 시 서버 부하 방지)
    for (const file of files) {
      try {
        const result = await uploadMutation.mutateAsync({ file });
        results.push(result);
      } catch (error) {
        console.error(`Failed to upload ${file.name}:`, error);
        // 일부 실패해도 계속 진행
      }
    }
    
    return results;
  };
  
  return {
    uploadMultiple: uploadMultipleFiles,
    isUploading: uploadMutation.isPending,
    error: uploadMutation.error
  };
}