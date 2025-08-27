import { useInfiniteQuery } from '@tanstack/react-query';
import { LibraryVideo, LibraryProject, UserUploadedVideo } from '@/shared/types/video-editor';
import { LibraryCounts } from '@/shared/types/library-modal';
import { LIBRARY_CACHE_KEYS } from '@/features/media-library/_components/constants/cache-keys';
import { LIBRARY_CACHE_POLICY } from '@/features/media-library/_components/constants/cache-policy';
import { fetchLibraryPage } from '@/features/media-library/_components/_services/api';

// 페이지네이션된 라이브러리 데이터 타입
export interface LibraryPage {
  clips: LibraryVideo[];
  projects: LibraryProject[];
  uploads: UserUploadedVideo[];
  counts: LibraryCounts;
  hasNextPage: boolean;
  nextCursor?: string;
  totalCount: number;
}

// API 응답 타입
// API 페이지 응답 타입은 서비스에서 직접 처리하므로 이 파일에서 별도 정의하지 않음

// Query Keys for Infinite Query - 통합된 캐시 키 사용
export const libraryInfiniteQueryKeys = LIBRARY_CACHE_KEYS.infinite;

// 기존 fetch 함수 제거하고 서비스 사용

// Infinite Query Hooks
export function useLibraryClipsInfinite(enabled = true, limit = 20) {
  return useInfiniteQuery({
    queryKey: libraryInfiniteQueryKeys.clips('regular', limit),
    queryFn: ({ pageParam }) => fetchLibraryPage({ type: 'clips', limit, cursor: pageParam }),
    enabled,
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.hasNextPage ? lastPage.nextCursor : undefined,
    staleTime: LIBRARY_CACHE_POLICY.clips.staleTime,
    gcTime: LIBRARY_CACHE_POLICY.clips.gcTime,
    retry: (failureCount, error) => {
      if (error instanceof Error && error.message.includes('401')) {
        return false;
      }
      return failureCount < 1;
    },
  });
}

export function useLibraryProjectsInfinite(enabled = true, limit = 20) {
  return useInfiniteQuery({
    queryKey: libraryInfiniteQueryKeys.projects(limit),
    queryFn: ({ pageParam }) => fetchLibraryPage({ type: 'projects', limit, cursor: pageParam }),
    enabled,
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.hasNextPage ? lastPage.nextCursor : undefined,
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

export function useLibraryUploadsInfinite(enabled = true, limit = 20) {
  return useInfiniteQuery({
    queryKey: libraryInfiniteQueryKeys.uploads(limit),
    queryFn: ({ pageParam }) => fetchLibraryPage({ type: 'uploads', limit, cursor: pageParam }),
    enabled,
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.hasNextPage ? lastPage.nextCursor : undefined,
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

// Query Options 인터페이스
interface LibraryQueryOptions {
  staleTime?: number;
  gcTime?: number;
  refetchOnWindowFocus?: boolean;
  refetchOnMount?: boolean | 'always';
}

// 새로 추가된 훅들 (성능 최적화)
export function useLibraryFavoritesInfinite(
  enabled = true, 
  limit = 20, 
  prefetch = false,
  options?: LibraryQueryOptions,
  sessionKey?: number | string
) {
  const baseKey = libraryInfiniteQueryKeys.clips('favorites', limit);
  const queryKey = sessionKey !== undefined ? ([...baseKey, 'session', sessionKey] as const) : baseKey;
  return useInfiniteQuery({
    queryKey,
    queryFn: ({ pageParam }) => fetchLibraryPage({ type: 'favorites', limit, cursor: pageParam, prefetch }),
    enabled,
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.hasNextPage ? lastPage.nextCursor : undefined,
    // 커스텀 옵션 우선, 없으면 기본값 사용
    staleTime: options?.staleTime ?? 0,
    gcTime: options?.gcTime ?? 0,
    refetchOnWindowFocus: options?.refetchOnWindowFocus ?? false,
    refetchOnMount: options?.refetchOnMount ?? 'always',
    retry: (failureCount, error) => {
      if (error instanceof Error && error.message.includes('401')) {
        return false;
      }
      return failureCount < 2;
    },
  });
}

export function useLibraryRegularInfinite(
  enabled = true, 
  limit = 20, 
  prefetch = false,
  options?: LibraryQueryOptions
) {
  return useInfiniteQuery({
    queryKey: libraryInfiniteQueryKeys.clips('regular', limit),
    queryFn: ({ pageParam }) => fetchLibraryPage({ type: 'regular', limit, cursor: pageParam, prefetch }),
    enabled,
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.hasNextPage ? lastPage.nextCursor : undefined,
    // 커스텀 옵션 우선, 없으면 기본값 사용
    staleTime: options?.staleTime ?? LIBRARY_CACHE_POLICY.clips.staleTime,
    gcTime: options?.gcTime ?? LIBRARY_CACHE_POLICY.clips.gcTime,
    refetchOnWindowFocus: options?.refetchOnWindowFocus ?? false,
    refetchOnMount: options?.refetchOnMount ?? false,
    retry: (failureCount, error) => {
      if (error instanceof Error && error.message.includes('401')) {
        return false;
      }
      return failureCount < 2;
    },
  });
}

/**
 * 통합 라이브러리 데이터를 무한 스크롤로 관리하는 메인 Hook
 * 첫 페이지는 프리페칭으로 즉시 로드, 이후는 스크롤 기반 자동 로드
 */
export function useCombinedLibraryInfinite(enabled = true, limit = 20) {
  return useInfiniteQuery({
    queryKey: libraryInfiniteQueryKeys.combined(limit),
    queryFn: ({ pageParam }) => fetchLibraryPage({ type: 'all', limit, cursor: pageParam }),
    enabled,
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.hasNextPage ? lastPage.nextCursor : undefined,
    staleTime: LIBRARY_CACHE_POLICY.combined.staleTime,
    gcTime: LIBRARY_CACHE_POLICY.combined.gcTime,
    retry: (failureCount, error) => {
      if (error instanceof Error && error.message.includes('401')) {
        return false;
      }
      return failureCount < 1;
    },
    // 캐시 우선 사용으로 프리페칭 효율성 극대화
    refetchOnMount: false,
    refetchOnReconnect: false,
  });
}

// 플래튼 데이터 추출을 위한 유틸리티 함수들
export function flattenInfiniteData<T>(pages: LibraryPage[], selector: (page: LibraryPage) => T[]): T[] {
  return pages.reduce((acc, page) => [...acc, ...selector(page)], [] as T[]);
}

// 각 데이터 타입별 플래튼 함수들
export function getAllClips(pages: LibraryPage[]): LibraryVideo[] {
  return flattenInfiniteData(pages, page => page.clips);
}

export function getAllProjects(pages: LibraryPage[]): LibraryProject[] {
  return flattenInfiniteData(pages, page => page.projects);
}

export function getAllUploads(pages: LibraryPage[]): UserUploadedVideo[] {
  return flattenInfiniteData(pages, page => page.uploads);
}

// 총 개수 계산
export function getTotalCounts(pages: LibraryPage[]): LibraryCounts {
  if (pages.length === 0) {
    return { favorites: 0, clips: 0, projects: 0, uploads: 0 };
  }
  
  // 첫 번째 페이지의 카운트 정보 사용 (전체 개수는 첫 페이지에서 제공)
  return pages[0].counts;
}

// 로딩 상태 확인
export function getInfiniteLoadingStatus(
  isFetching: boolean,
  isFetchingNextPage: boolean,
  hasNextPage: boolean
) {
  return {
    isInitialLoading: isFetching && !isFetchingNextPage,
    isLoadingMore: isFetchingNextPage,
    canLoadMore: hasNextPage && !isFetchingNextPage,
    isEmpty: !isFetching && !hasNextPage
  };
}