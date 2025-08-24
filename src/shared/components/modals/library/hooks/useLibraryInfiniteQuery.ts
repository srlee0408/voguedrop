import { useInfiniteQuery } from '@tanstack/react-query';
import { LibraryVideo, LibraryProject, UserUploadedVideo } from '@/shared/types/video-editor';
import { LibraryCounts } from '@/shared/types/library-modal';

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
interface LibraryApiPageResponse {
  clips?: LibraryVideo[];
  videos?: LibraryVideo[];
  projects?: LibraryProject[];
  uploads?: UserUploadedVideo[];
  counts?: LibraryCounts;
  hasNextPage: boolean;
  nextCursor?: string;
  totalCount: number;
}

// Query Keys for Infinite Query (확장된 타입 지원)
export const libraryInfiniteQueryKeys = {
  all: ['library-infinite'] as const,
  clips: (limit = 20) => [...libraryInfiniteQueryKeys.all, 'clips', limit] as const,
  favorites: (limit = 20) => [...libraryInfiniteQueryKeys.all, 'favorites', limit] as const,
  regular: (limit = 20) => [...libraryInfiniteQueryKeys.all, 'regular', limit] as const,
  projects: (limit = 20) => [...libraryInfiniteQueryKeys.all, 'projects', limit] as const,
  uploads: (limit = 20) => [...libraryInfiniteQueryKeys.all, 'uploads', limit] as const,
  combined: (limit = 20) => [...libraryInfiniteQueryKeys.all, 'combined', limit] as const,
};

// API 함수들 (성능 최적화 및 타입 확장)
const fetchLibraryPage = async (
  cursor: string | undefined,
  limit = 20,
  type: 'all' | 'clips' | 'projects' | 'uploads' | 'favorites' | 'regular' = 'all',
  prefetch = false
): Promise<LibraryPage> => {
  const params = new URLSearchParams({
    limit: limit.toString(),
    type: type,
    ...(prefetch && { prefetch: 'true' })
  });
  
  if (cursor) {
    params.append('cursor', cursor);
  }
  
  const response = await fetch(`/api/canvas/library?${params.toString()}`, {
    headers: {
      'Content-Type': 'application/json',
    },
  });
  
  if (!response.ok) {
    throw new Error(`Failed to fetch library data: ${response.statusText}`);
  }
  
  const data: LibraryApiPageResponse = await response.json();
  
  // 응답 데이터 정규화
  const clips = data.clips || data.videos || [];
  const projects = data.projects || [];
  const uploads = data.uploads || [];
  
  return {
    clips,
    projects,
    uploads,
    counts: data.counts || {
      favorites: 0,
      clips: clips.length,
      projects: projects.length,
      uploads: uploads.length
    },
    hasNextPage: data.hasNextPage,
    nextCursor: data.nextCursor,
    totalCount: data.totalCount
  };
};

// Infinite Query Hooks
export function useLibraryClipsInfinite(enabled = true, limit = 20) {
  return useInfiniteQuery({
    queryKey: libraryInfiniteQueryKeys.clips(limit),
    queryFn: ({ pageParam }) => fetchLibraryPage(pageParam, limit, 'clips'),
    enabled,
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.hasNextPage ? lastPage.nextCursor : undefined,
    staleTime: 10 * 60 * 1000, // 10분간 fresh
    gcTime: 2 * 60 * 60 * 1000, // 2시간간 캐시 유지
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
    queryFn: ({ pageParam }) => fetchLibraryPage(pageParam, limit, 'projects'),
    enabled,
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.hasNextPage ? lastPage.nextCursor : undefined,
    staleTime: 30 * 60 * 1000, // 30분간 fresh
    gcTime: 4 * 60 * 60 * 1000, // 4시간간 캐시 유지
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
    queryFn: ({ pageParam }) => fetchLibraryPage(pageParam, limit, 'uploads'),
    enabled,
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.hasNextPage ? lastPage.nextCursor : undefined,
    staleTime: 60 * 60 * 1000, // 1시간간 fresh
    gcTime: 6 * 60 * 60 * 1000, // 6시간간 캐시 유지
    retry: (failureCount, error) => {
      if (error instanceof Error && error.message.includes('401')) {
        return false;
      }
      return failureCount < 1;
    },
  });
}

// 새로 추가된 훅들 (성능 최적화)
export function useLibraryFavoritesInfinite(enabled = true, limit = 20, prefetch = false) {
  return useInfiniteQuery({
    queryKey: libraryInfiniteQueryKeys.favorites(limit),
    queryFn: ({ pageParam }) => fetchLibraryPage(pageParam, limit, 'favorites', prefetch),
    enabled,
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.hasNextPage ? lastPage.nextCursor : undefined,
    staleTime: prefetch ? 5 * 60 * 1000 : 30 * 1000, // 프리페칭: 5분, 일반: 30초
    gcTime: prefetch ? 10 * 60 * 1000 : 5 * 60 * 1000, // 프리페칭: 10분, 일반: 5분
    refetchOnWindowFocus: false,
    retry: (failureCount, error) => {
      if (error instanceof Error && error.message.includes('401')) {
        return false;
      }
      return failureCount < 2;
    },
  });
}

export function useLibraryRegularInfinite(enabled = true, limit = 20, prefetch = false) {
  return useInfiniteQuery({
    queryKey: libraryInfiniteQueryKeys.regular(limit),
    queryFn: ({ pageParam }) => fetchLibraryPage(pageParam, limit, 'regular', prefetch),
    enabled,
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.hasNextPage ? lastPage.nextCursor : undefined,
    staleTime: prefetch ? 5 * 60 * 1000 : 30 * 1000, // 프리페칭: 5분, 일반: 30초
    gcTime: prefetch ? 10 * 60 * 1000 : 5 * 60 * 1000, // 프리페칭: 10분, 일반: 5분
    refetchOnWindowFocus: false,
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
    queryFn: ({ pageParam }) => fetchLibraryPage(pageParam, limit, 'all'),
    enabled,
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.hasNextPage ? lastPage.nextCursor : undefined,
    staleTime: 15 * 60 * 1000, // 15분간 fresh
    gcTime: 3 * 60 * 60 * 1000, // 3시간간 캐시 유지
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