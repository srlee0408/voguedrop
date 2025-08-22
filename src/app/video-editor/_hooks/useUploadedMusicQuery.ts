import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export interface UploadedAudio {
  id: string;
  file_name: string;
  url: string;
  duration: number | null;
  file_size: number;
  uploaded_at: string;
  metadata?: {
    mime_type?: string;
    original_name?: string;
  };
}

interface UploadedMusicResponse {
  success: boolean;
  music: UploadedAudio[];
  total: number;
}

interface UploadMusicResponse {
  success: boolean;
  music: UploadedAudio;
}

interface UploadMusicParams {
  file: File;
  duration?: number;
}

// API 함수들
const fetchUploadedMusic = async (params?: {
  genre?: string;
  limit?: number;
  offset?: number;
}): Promise<UploadedAudio[]> => {
  const searchParams = new URLSearchParams();
  
  if (params?.genre) {
    searchParams.append('genre', params.genre);
  }
  if (params?.limit) {
    searchParams.append('limit', params.limit.toString());
  }
  if (params?.offset) {
    searchParams.append('offset', params.offset.toString());
  }
  
  const url = `/api/upload/music${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;
  
  const response = await fetch(url);
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to load uploaded music');
  }
  
  const data: UploadedMusicResponse = await response.json();
  
  if (data.success && data.music) {
    return data.music;
  }
  
  return [];
};

const uploadMusic = async ({ file, duration }: UploadMusicParams): Promise<UploadedAudio> => {
  const formData = new FormData();
  formData.append('file', file);
  
  if (duration !== undefined) {
    formData.append('duration', duration.toString());
  }
  
  const response = await fetch('/api/upload/music', {
    method: 'POST',
    body: formData,
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Upload failed');
  }
  
  const data: UploadMusicResponse = await response.json();
  
  if (data.success && data.music) {
    return data.music;
  }
  
  throw new Error('Upload response format error');
};

const deleteUploadedMusic = async (musicId: string): Promise<void> => {
  const response = await fetch(`/api/upload/music?id=${musicId}`, {
    method: 'DELETE',
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Delete failed');
  }
};

// Query Keys
export const uploadMusicQueryKeys = {
  all: ['uploadedMusic'] as const,
  lists: () => [...uploadMusicQueryKeys.all, 'list'] as const,
  list: (params?: { genre?: string; limit?: number; offset?: number }) => 
    [...uploadMusicQueryKeys.lists(), params] as const,
};

// 커스텀 Hooks
export function useUploadedMusic(
  params?: { genre?: string; limit?: number; offset?: number },
  enabled = true
) {
  return useQuery({
    queryKey: uploadMusicQueryKeys.list(params),
    queryFn: () => fetchUploadedMusic(params),
    enabled,
    staleTime: 10 * 60 * 1000, // 10분간 fresh (업로드 파일은 자주 변경되지 않음)
    gcTime: 30 * 60 * 1000, // 30분간 캐시 유지
    retry: (failureCount, error) => {
      // 401 에러 (인증 실패)는 재시도하지 않음
      if (error instanceof Error && error.message.includes('401')) {
        return false;
      }
      return failureCount < 1;
    },
  });
}

export function useUploadMusic() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: uploadMusic,
    onSuccess: (newMusic) => {
      // 업로드 성공 시 목록에 새 파일 추가 (Optimistic Update)
      queryClient.setQueryData(
        uploadMusicQueryKeys.list(),
        (oldData: UploadedAudio[] | undefined) => {
          if (!oldData) return [newMusic];
          return [newMusic, ...oldData];
        }
      );
      
      // 모든 업로드 음악 관련 쿼리 무효화
      queryClient.invalidateQueries({ 
        queryKey: uploadMusicQueryKeys.all 
      });
    },
    onError: (error) => {
      console.error('Music upload failed:', error);
    },
  });
}

export function useDeleteUploadedMusic() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: deleteUploadedMusic,
    onMutate: async (musicId) => {
      // 삭제하기 전에 캐시 업데이트 (Optimistic Update)
      await queryClient.cancelQueries({ 
        queryKey: uploadMusicQueryKeys.all 
      });
      
      const previousData = queryClient.getQueryData(uploadMusicQueryKeys.list());
      
      // 삭제할 아이템을 캐시에서 제거
      queryClient.setQueryData(
        uploadMusicQueryKeys.list(),
        (oldData: UploadedAudio[] | undefined) => {
          if (!oldData) return [];
          return oldData.filter(music => music.id !== musicId);
        }
      );
      
      return { previousData };
    },
    onError: (error, musicId, context) => {
      // 에러 발생 시 이전 데이터로 롤백
      if (context?.previousData) {
        queryClient.setQueryData(
          uploadMusicQueryKeys.list(),
          context.previousData
        );
      }
      console.error('Music deletion failed:', error);
    },
    onSettled: () => {
      // 성공/실패 관계없이 최종적으로 서버에서 최신 데이터 가져오기
      queryClient.invalidateQueries({ 
        queryKey: uploadMusicQueryKeys.all 
      });
    },
  });
}

// 업로드 진행률 추적을 위한 Hook (향후 확장 가능)
export function useUploadProgress() {
  const queryClient = useQueryClient();
  
  return {
    onUploadStart: (fileId: string) => {
      queryClient.setQueryData(['uploadProgress', fileId], {
        progress: 0,
        status: 'uploading',
      });
    },
    onUploadProgress: (fileId: string, progress: number) => {
      queryClient.setQueryData(['uploadProgress', fileId], {
        progress,
        status: 'uploading',
      });
    },
    onUploadComplete: (fileId: string) => {
      queryClient.setQueryData(['uploadProgress', fileId], {
        progress: 100,
        status: 'completed',
      });
      
      // 일정 시간 후 진행률 데이터 제거
      setTimeout(() => {
        queryClient.removeQueries({ 
          queryKey: ['uploadProgress', fileId] 
        });
      }, 3000);
    },
    onUploadError: (fileId: string, error: string) => {
      queryClient.setQueryData(['uploadProgress', fileId], {
        progress: 0,
        status: 'error',
        error,
      });
    },
  };
}

// 수동으로 uploaded music 새로고침
export function useRefreshUploadedMusic() {
  const queryClient = useQueryClient();
  
  return () => {
    queryClient.invalidateQueries({
      queryKey: uploadMusicQueryKeys.all,
    });
  };
}