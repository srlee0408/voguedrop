import { useCallback, useEffect, useMemo } from 'react';
import { LibraryVideo, LibraryProject, UserUploadedVideo } from '@/shared/types/video-editor';
import { LibraryCounts } from '@/shared/types/library-modal';
import { useAuth } from '@/shared/lib/auth/AuthContext';
import { 
  useCombinedLibraryInfinite,
  getAllClips,
  getAllProjects,
  getAllUploads,
  getTotalCounts,
  getInfiniteLoadingStatus
} from './useLibraryInfiniteQuery';
import { useLibraryInfinitePrefetch } from './useLibraryInfinitePrefetch';

interface UseLibraryInfiniteDataReturn {
  // 데이터
  clipItems: LibraryVideo[];
  projectItems: LibraryProject[];
  uploadItems: UserUploadedVideo[];
  counts: LibraryCounts;
  
  // 상태
  isInitialLoading: boolean;
  isLoadingMore: boolean;
  canLoadMore: boolean;
  isEmpty: boolean;
  error: string | null;
  
  // 액션
  loadMore: () => void;
  refetch: () => Promise<void>;
  
  // 스크롤 감지용
  lastElementRef: (node: HTMLElement | null) => void;
}

/**
 * Library 데이터를 무한 스크롤로 관리하는 커스텀 훅
 * Infinite Query와 프리페칭을 결합하여 최적의 사용자 경험 제공
 * @param isOpen - 모달이 열려있는지 여부
 * @param limit - 페이지당 아이템 수 (기본값: 20)
 * @returns Library 무한 스크롤 데이터와 관련 메서드
 */
export function useLibraryInfiniteData(
  isOpen: boolean, 
  limit = 20
): UseLibraryInfiniteDataReturn {
  const { user } = useAuth();
  const { 
    getInfinitePrefetchStatus, 
    prefetchFirstPageFull,
    prefetchOnScroll
  } = useLibraryInfinitePrefetch();
  
  // Progressive Enhancement: 모달이 열릴 때 첫 페이지 전체 데이터 확보
  useEffect(() => {
    if (isOpen && user) {
      const status = getInfinitePrefetchStatus();
      
      // 첫 페이지 전체 데이터가 아직 프리페칭되지 않은 경우에만 로드
      if (!status.firstPageFull) {
        prefetchFirstPageFull();
      }
    }
  }, [isOpen, user, getInfinitePrefetchStatus, prefetchFirstPageFull]);
  
  // Infinite Query 사용
  const {
    data,
    isLoading,
    isFetching,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    error: queryError,
    refetch
  } = useCombinedLibraryInfinite(isOpen && !!user, limit);
  
  // 플래튼된 데이터 추출
  const flatData = useMemo(() => {
    if (!data?.pages) {
      return {
        clipItems: [] as LibraryVideo[],
        projectItems: [] as LibraryProject[],
        uploadItems: [] as UserUploadedVideo[],
        counts: { clips: 0, projects: 0, uploads: 0 } as LibraryCounts
      };
    }
    
    return {
      clipItems: getAllClips(data.pages),
      projectItems: getAllProjects(data.pages),
      uploadItems: getAllUploads(data.pages),
      counts: getTotalCounts(data.pages)
    };
  }, [data?.pages]);
  
  // 로딩 상태 계산
  const loadingStatus = useMemo(() => 
    getInfiniteLoadingStatus(isFetching, isFetchingNextPage, hasNextPage),
    [isFetching, isFetchingNextPage, hasNextPage]
  );
  
  // 에러 처리
  const error = queryError instanceof Error ? queryError.message : null;
  
  // 더 많은 데이터 로드
  const loadMore = useCallback(() => {
    if (loadingStatus.canLoadMore) {
      fetchNextPage();
    }
  }, [fetchNextPage, loadingStatus.canLoadMore]);
  
  // 수동 리페치 래퍼
  const handleRefetch = useCallback(async () => {
    await refetch();
  }, [refetch]);
  
  // Intersection Observer를 위한 ref callback
  const lastElementRef = useCallback((node: HTMLElement | null) => {
    if (!node) return;
    
    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting && loadingStatus.canLoadMore) {
          loadMore();
          
          // 스크롤 기반 지능형 프리페칭 트리거
          const scrollPercentage = entry.boundingClientRect.top / window.innerHeight;
          prefetchOnScroll(1 - scrollPercentage); // 화면 하단에 가까울수록 높은 값
        }
      },
      {
        threshold: 0.1,
        rootMargin: '100px' // 100px 전에 미리 로드 시작
      }
    );
    
    observer.observe(node);
    
    // 클린업
    return () => observer.disconnect();
  }, [loadMore, loadingStatus.canLoadMore, prefetchOnScroll]);

  return {
    // 데이터
    clipItems: flatData.clipItems,
    projectItems: flatData.projectItems,
    uploadItems: flatData.uploadItems,
    counts: flatData.counts,
    
    // 상태
    isInitialLoading: isLoading || loadingStatus.isInitialLoading,
    isLoadingMore: loadingStatus.isLoadingMore,
    canLoadMore: loadingStatus.canLoadMore,
    isEmpty: loadingStatus.isEmpty && flatData.clipItems.length === 0,
    error,
    
    // 액션
    loadMore,
    refetch: handleRefetch,
    
    // 스크롤 감지용
    lastElementRef
  };
}

// 개별 카테고리용 훅들
export function useLibraryClipsInfiniteData(isOpen: boolean, limit = 20) {
  const { user } = useAuth();
  
  const {
    data,
    isFetching,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    error,
    refetch
  } = useCombinedLibraryInfinite(isOpen && !!user, limit);
  
  const clipItems = useMemo(() => 
    data?.pages ? getAllClips(data.pages) : [],
    [data?.pages]
  );
  
  const loadingStatus = getInfiniteLoadingStatus(isFetching, isFetchingNextPage, hasNextPage);
  
  return {
    items: clipItems,
    ...loadingStatus,
    loadMore: () => loadingStatus.canLoadMore && fetchNextPage(),
    error: error instanceof Error ? error.message : null,
    refetch
  };
}

export function useLibraryProjectsInfiniteData(isOpen: boolean, limit = 20) {
  const { user } = useAuth();
  
  const {
    data,
    isFetching,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    error,
    refetch
  } = useCombinedLibraryInfinite(isOpen && !!user, limit);
  
  const projectItems = useMemo(() => 
    data?.pages ? getAllProjects(data.pages) : [],
    [data?.pages]
  );
  
  const loadingStatus = getInfiniteLoadingStatus(isFetching, isFetchingNextPage, hasNextPage);
  
  return {
    items: projectItems,
    ...loadingStatus,
    loadMore: () => loadingStatus.canLoadMore && fetchNextPage(),
    error: error instanceof Error ? error.message : null,
    refetch
  };
}

export function useLibraryUploadsInfiniteData(isOpen: boolean, limit = 20) {
  const { user } = useAuth();
  
  const {
    data,
    isFetching,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    error,
    refetch
  } = useCombinedLibraryInfinite(isOpen && !!user, limit);
  
  const uploadItems = useMemo(() => 
    data?.pages ? getAllUploads(data.pages) : [],
    [data?.pages]
  );
  
  const loadingStatus = getInfiniteLoadingStatus(isFetching, isFetchingNextPage, hasNextPage);
  
  return {
    items: uploadItems,
    ...loadingStatus,
    loadMore: () => loadingStatus.canLoadMore && fetchNextPage(),
    error: error instanceof Error ? error.message : null,
    refetch
  };
}