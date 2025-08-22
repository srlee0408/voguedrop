import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { LibraryVideo, LibraryProject, UserUploadedVideo } from '@/shared/types/video-editor';
import { LibraryCounts } from '@/shared/types/library-modal';

// 통합 라이브러리 데이터 타입
export interface LibraryData {
  clips: LibraryVideo[];
  projects: LibraryProject[];
  uploads: UserUploadedVideo[];
  counts: LibraryCounts;
}

// API 응답 타입
interface LibraryApiResponse {
  clips?: LibraryVideo[];
  videos?: LibraryVideo[]; // API에서 videos로 반환할 수도 있음
  projects?: LibraryProject[];
  uploads?: UserUploadedVideo[];
  counts?: LibraryCounts;
}

// Query Keys - PROJECT_GUIDE.md 네이밍 컨벤션 준수
export const libraryQueryKeys = {
  all: ['library'] as const,
  clips: () => [...libraryQueryKeys.all, 'clips'] as const,
  projects: () => [...libraryQueryKeys.all, 'projects'] as const,
  uploads: () => [...libraryQueryKeys.all, 'uploads'] as const,
  combined: (limit?: number) => [...libraryQueryKeys.all, 'combined', limit] as const,
};

// API 함수들
const fetchLibraryData = async (limit = 50): Promise<LibraryData> => {
  const response = await fetch(`/api/canvas/library?limit=${limit}`);
  
  if (!response.ok) {
    throw new Error('Failed to fetch library data');
  }
  
  const data: LibraryApiResponse = await response.json();
  
  // 응답 데이터 정규화
  const clips = data.clips || data.videos || [];
  const projects = data.projects || [];
  const uploads = data.uploads || [];
  
  return {
    clips,
    projects,
    uploads,
    counts: data.counts || {
      clips: clips.length,
      projects: projects.length,
      uploads: uploads.length
    }
  };
};

const fetchLibraryClips = async (limit = 50): Promise<LibraryVideo[]> => {
  const data = await fetchLibraryData(limit);
  return data.clips;
};

const fetchLibraryProjects = async (limit = 50): Promise<LibraryProject[]> => {
  const data = await fetchLibraryData(limit);
  return data.projects;
};

const fetchLibraryUploads = async (limit = 50): Promise<UserUploadedVideo[]> => {
  const data = await fetchLibraryData(limit);
  return data.uploads;
};

// React Query Hooks
export function useLibraryClips(enabled = true, limit = 50) {
  return useQuery({
    queryKey: libraryQueryKeys.clips(),
    queryFn: () => fetchLibraryClips(limit),
    enabled,
    staleTime: 5 * 60 * 1000, // 5분간 fresh (클립은 자주 업데이트됨)
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

export function useLibraryProjects(enabled = true, limit = 50) {
  return useQuery({
    queryKey: libraryQueryKeys.projects(),
    queryFn: () => fetchLibraryProjects(limit),
    enabled,
    staleTime: 10 * 60 * 1000, // 10분간 fresh (프로젝트는 덜 자주 변경됨)
    gcTime: 60 * 60 * 1000, // 1시간간 캐시 유지
    retry: (failureCount, error) => {
      if (error instanceof Error && error.message.includes('401')) {
        return false;
      }
      return failureCount < 1;
    },
  });
}

export function useLibraryUploads(enabled = true, limit = 50) {
  return useQuery({
    queryKey: libraryQueryKeys.uploads(),
    queryFn: () => fetchLibraryUploads(limit),
    enabled,
    staleTime: 30 * 60 * 1000, // 30분간 fresh (업로드는 거의 변경되지 않음)
    gcTime: 2 * 60 * 60 * 1000, // 2시간간 캐시 유지
    retry: (failureCount, error) => {
      if (error instanceof Error && error.message.includes('401')) {
        return false;
      }
      return failureCount < 1;
    },
  });
}

/**
 * 통합 라이브러리 데이터를 관리하는 메인 Hook
 * PROJECT_GUIDE.md에 따라 React Query를 사용한 서버 상태 관리
 */
export function useCombinedLibraryData(enabled = true, limit = 50) {
  return useQuery({
    queryKey: libraryQueryKeys.combined(limit),
    queryFn: () => fetchLibraryData(limit),
    enabled,
    staleTime: 5 * 60 * 1000, // 5분간 fresh
    gcTime: 30 * 60 * 1000, // 30분간 캐시 유지
    retry: (failureCount, error) => {
      if (error instanceof Error && error.message.includes('401')) {
        return false;
      }
      return failureCount < 1;
    },
    // 데이터 선택자 - 필요한 데이터만 추출
    select: (data: LibraryData) => ({
      clipItems: data.clips,
      projectItems: data.projects,
      uploadItems: data.uploads,
      counts: data.counts,
    })
  });
}

// 개별 항목 업데이트용 Mutation Hooks
export function useUpdateUploadItems() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (newItem: UserUploadedVideo) => {
      // 실제 API 호출 없이 캐시만 업데이트 (Optimistic Update)
      return newItem;
    },
    onSuccess: (newItem) => {
      // uploads 쿼리 업데이트
      queryClient.setQueryData(
        libraryQueryKeys.uploads(),
        (oldData: UserUploadedVideo[] | undefined) => {
          if (!oldData) return [newItem];
          return [newItem, ...oldData];
        }
      );
      
      // combined 쿼리 업데이트
      queryClient.setQueryData(
        libraryQueryKeys.combined(),
        (oldData: LibraryData | undefined) => {
          if (!oldData) return undefined;
          return {
            ...oldData,
            uploads: [newItem, ...oldData.uploads],
            counts: {
              ...oldData.counts,
              uploads: oldData.counts.uploads + 1
            }
          };
        }
      );
    },
  });
}

export function useUpdateCounts() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ key, delta }: { key: keyof LibraryCounts; delta: number }) => {
      return { key, delta };
    },
    onSuccess: ({ key, delta }) => {
      // combined 쿼리의 counts 업데이트
      queryClient.setQueryData(
        libraryQueryKeys.combined(),
        (oldData: LibraryData | undefined) => {
          if (!oldData) return undefined;
          return {
            ...oldData,
            counts: {
              ...oldData.counts,
              [key]: oldData.counts[key] + delta
            }
          };
        }
      );
    },
  });
}

// 수동 리페치를 위한 Hook
export function useRefreshLibraryData() {
  const queryClient = useQueryClient();
  
  return () => {
    queryClient.invalidateQueries({
      queryKey: libraryQueryKeys.all,
    });
  };
}