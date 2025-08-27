/**
 * useLibraryQuery - 라이브러리 데이터 쿼리 관리 훅
 * 
 * 주요 역할:
 * 1. 클립, 프로젝트, 업로드 데이터의 개별 및 통합 쿼리 관리
 * 2. React Query 기반 서버 상태 관리 및 캐싱 최적화
 * 3. Optimistic Update를 통한 즉각적인 UI 업데이트
 * 4. 인증 실패 시 자동 재시도 중단 및 에러 처리
 * 
 * 핵심 특징:
 * - 3가지 데이터 타입별 독립적인 쿼리 훅 제공
 * - useCombinedLibraryData로 통합 데이터 관리
 * - useUpdateUploadItems/useUpdateCounts로 낙관적 업데이트
 * - 캐시 정책 기반 데이터 신선도 관리
 * - 무한 스크롤 쿼리와 캐시 동기화
 * 
 * 주의사항:
 * - 401 인증 에러 시 재시도하지 않음
 * - Optimistic Update는 실제 API 호출 없이 캐시만 업데이트
 * - combined 쿼리는 개별 쿼리들과 캐시 동기화 필요
 */
import { useQuery, useMutation, useQueryClient, InfiniteData } from '@tanstack/react-query';
import { LibraryVideo, LibraryProject, UserUploadedVideo } from '@/shared/types/video-editor';
import { LibraryCounts } from '@/shared/types/library-modal';
import { LIBRARY_CACHE_KEYS } from '../constants/cache-keys';
import { LibraryPage } from './useLibraryInfiniteQuery';
import { LIBRARY_CACHE_POLICY } from '../constants/cache-policy';
import { fetchLibraryPage } from '../_services/api';

// 통합 라이브러리 데이터 타입
export interface LibraryData {
  clips: LibraryVideo[];
  projects: LibraryProject[];
  uploads: UserUploadedVideo[];
  counts: LibraryCounts;
}

// API 응답 타입
// API 응답 타입은 서비스에서 처리하므로 로컬 정의 제거

// 더 이상 별칭을 노출하지 않음. 직접 LIBRARY_CACHE_KEYS만 사용.

// API 함수들
const fetchLibraryData = async (limit = 50): Promise<LibraryData> => {
  const res = await fetchLibraryPage({ type: 'all', limit });
  const clips = res.clips || res.videos || [];
  const projects = res.projects || [];
  const uploads = res.uploads || [];
  return {
    clips,
    projects,
    uploads,
    counts: res.counts || {
      favorites: 0,
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
    queryKey: LIBRARY_CACHE_KEYS.clips.all(),
    queryFn: () => fetchLibraryClips(limit),
    enabled,
    staleTime: LIBRARY_CACHE_POLICY.clips.staleTime,
    gcTime: LIBRARY_CACHE_POLICY.clips.gcTime,
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
    queryKey: LIBRARY_CACHE_KEYS.projects.all(),
    queryFn: () => fetchLibraryProjects(limit),
    enabled,
    staleTime: LIBRARY_CACHE_POLICY.projects.staleTime,
    gcTime: LIBRARY_CACHE_POLICY.projects.gcTime,
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
    queryKey: LIBRARY_CACHE_KEYS.uploads.all(),
    queryFn: () => fetchLibraryUploads(limit),
    enabled,
    staleTime: LIBRARY_CACHE_POLICY.uploads.staleTime,
    gcTime: LIBRARY_CACHE_POLICY.uploads.gcTime,
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
 * 프리페칭 최적화를 위해 캐시 시간 연장
 */
export function useCombinedLibraryData(enabled = true, limit = 50) {
  return useQuery({
    queryKey: LIBRARY_CACHE_KEYS.combined.all(limit),
    queryFn: () => fetchLibraryData(limit),
    enabled,
    staleTime: LIBRARY_CACHE_POLICY.combined.staleTime,
    gcTime: LIBRARY_CACHE_POLICY.combined.gcTime,
    retry: (failureCount, error) => {
      if (error instanceof Error && error.message.includes('401')) {
        return false;
      }
      return failureCount < 1;
    },
    // 네트워크 우선 모드 비활성화 (캐시 우선 사용)
    refetchOnMount: false,
    refetchOnReconnect: false,
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
        LIBRARY_CACHE_KEYS.uploads.all(),
        (oldData: UserUploadedVideo[] | undefined) => {
          if (!oldData) return [newItem];
          return [newItem, ...oldData];
        }
      );
      
      // combined 쿼리 업데이트
      queryClient.setQueryData(
        LIBRARY_CACHE_KEYS.combined.all(),
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

      // infinite uploads 첫 페이지에 낙관적 추가
      queryClient.setQueryData(
        LIBRARY_CACHE_KEYS.infinite.uploads(20),
        (oldData: InfiniteData<LibraryPage> | undefined) => {
          if (!oldData || !oldData.pages?.length) return oldData;
          const [first, ...rest] = oldData.pages;
          const updatedFirst: LibraryPage = {
            ...first,
            uploads: [newItem, ...(first.uploads || [])],
            counts: {
              ...first.counts,
              uploads: (first.counts?.uploads || 0) + 1,
              favorites: first.counts?.favorites || 0,
              clips: first.counts?.clips || 0,
              projects: first.counts?.projects || 0,
            }
          };
          return { ...oldData, pages: [updatedFirst, ...rest] };
        }
      );

      // infinite combined 첫 페이지에도 반영 (존재할 경우)
      queryClient.setQueryData(
        LIBRARY_CACHE_KEYS.infinite.combined(20),
        (oldData: InfiniteData<LibraryPage> | undefined) => {
          if (!oldData || !oldData.pages?.length) return oldData;
          const [first, ...rest] = oldData.pages;
          const updatedFirst: LibraryPage = {
            ...first,
            uploads: [newItem, ...(first.uploads || [])],
            counts: {
              ...first.counts,
              uploads: (first.counts?.uploads || 0) + 1,
              favorites: first.counts?.favorites || 0,
              clips: first.counts?.clips || 0,
              projects: first.counts?.projects || 0,
            }
          };
          return { ...oldData, pages: [updatedFirst, ...rest] };
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
        LIBRARY_CACHE_KEYS.combined.all(),
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
      queryKey: [LIBRARY_CACHE_KEYS.base],
    });
  };
}