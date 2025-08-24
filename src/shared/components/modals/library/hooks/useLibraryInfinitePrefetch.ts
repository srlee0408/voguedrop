import { useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { libraryInfiniteQueryKeys } from './useLibraryInfiniteQuery';
import { useAuth } from '@/shared/lib/auth/AuthContext';

// 프리페칭 상태 추적을 위한 플래그
interface InfinitePrefetchFlags {
  firstPageCounts: boolean;
  firstPageBasic: boolean;
  firstPageFull: boolean;
  favorites: boolean;
  regular: boolean;
}

/**
 * Library Modal Infinite Query 프리페칭을 위한 훅
 * 첫 페이지 데이터를 미리 로드하여 즉각적인 사용자 경험 제공
 */
export function useLibraryInfinitePrefetch() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const prefetchFlags = useRef<InfinitePrefetchFlags>({
    firstPageCounts: false,
    firstPageBasic: false,
    firstPageFull: false,
    favorites: false,
    regular: false
  });

  // API 함수들 (첫 페이지만 가져오는 용도)
  const fetchFirstPageCounts = async () => {
    const response = await fetch('/api/canvas/library?limit=1&counts_only=true');
    if (!response.ok) throw new Error('Failed to fetch library counts');
    return response.json();
  };

  const fetchFirstPageBasic = async () => {
    const response = await fetch('/api/canvas/library?limit=10&type=all');
    if (!response.ok) throw new Error('Failed to fetch first page basic');
    return response.json();
  };

  const fetchFirstPageFull = async () => {
    const response = await fetch('/api/canvas/library?limit=20&type=all');
    if (!response.ok) throw new Error('Failed to fetch first page full');
    return response.json();
  };

  const fetchFavorites = async () => {
    const response = await fetch('/api/canvas/library?type=favorites&limit=20&prefetch=true');
    if (!response.ok) throw new Error('Failed to fetch favorites');
    return response.json();
  };

  const fetchRegular = async () => {
    const response = await fetch('/api/canvas/library?type=regular&limit=20&prefetch=true');
    if (!response.ok) throw new Error('Failed to fetch regular clips');
    return response.json();
  };

  // 1단계: 카운트 정보만 프리페칭 (매우 빠름)
  const prefetchFirstPageCounts = useCallback(async () => {
    if (!user || prefetchFlags.current.firstPageCounts) return;
    
    try {
      await queryClient.prefetchInfiniteQuery({
        queryKey: [...libraryInfiniteQueryKeys.all, 'counts-only'],
        queryFn: () => fetchFirstPageCounts(),
        initialPageParam: undefined,
        staleTime: 10 * 60 * 1000,
      });
      prefetchFlags.current.firstPageCounts = true;
    } catch (error) {
      console.warn('Failed to prefetch library counts:', error);
    }
  }, [user, queryClient]);

  // 2단계: 첫 페이지 기본 데이터 프리페칭 (10개)
  const prefetchFirstPageBasic = useCallback(async () => {
    if (!user || prefetchFlags.current.firstPageBasic) return;
    
    try {
      await queryClient.prefetchInfiniteQuery({
        queryKey: libraryInfiniteQueryKeys.combined(10),
        queryFn: () => fetchFirstPageBasic(),
        initialPageParam: undefined,
        staleTime: 15 * 60 * 1000,
      });
      prefetchFlags.current.firstPageBasic = true;
    } catch (error) {
      console.warn('Failed to prefetch first page basic:', error);
    }
  }, [user, queryClient]);

  // 3단계: 첫 페이지 전체 데이터 프리페칭 (20개)
  const prefetchFirstPageFull = useCallback(async () => {
    if (!user || prefetchFlags.current.firstPageFull) return;
    
    try {
      await queryClient.prefetchInfiniteQuery({
        queryKey: libraryInfiniteQueryKeys.combined(20),
        queryFn: () => fetchFirstPageFull(),
        initialPageParam: undefined,
        staleTime: 30 * 60 * 1000,
      });
      prefetchFlags.current.firstPageFull = true;
    } catch (error) {
      console.warn('Failed to prefetch first page full:', error);
    }
  }, [user, queryClient]);

  // 4단계: Favorites 데이터 프리페칭
  const prefetchFavorites = useCallback(async () => {
    if (!user || prefetchFlags.current.favorites) return;
    
    try {
      await queryClient.prefetchInfiniteQuery({
        queryKey: ['library', 'favorites', 20],
        queryFn: () => fetchFavorites(),
        initialPageParam: undefined,
        staleTime: 15 * 60 * 1000, // 15분간 fresh
      });
      prefetchFlags.current.favorites = true;
    } catch (error) {
      console.warn('Failed to prefetch favorites:', error);
    }
  }, [user, queryClient]);

  // 5단계: Regular clips 데이터 프리페칭
  const prefetchRegular = useCallback(async () => {
    if (!user || prefetchFlags.current.regular) return;
    
    try {
      await queryClient.prefetchInfiniteQuery({
        queryKey: ['library', 'regular', 20],
        queryFn: () => fetchRegular(),
        initialPageParam: undefined,
        staleTime: 15 * 60 * 1000, // 15분간 fresh
      });
      prefetchFlags.current.regular = true;
    } catch (error) {
      console.warn('Failed to prefetch regular clips:', error);
    }
  }, [user, queryClient]);

  // Progressive Enhancement 프리페칭 (단계별)
  const prefetchProgressivelyInfinite = useCallback(async () => {
    if (!user) return;
    
    // 1단계: 카운트 (즉시)
    await prefetchFirstPageCounts();
    
    // 2단계: 기본 데이터 + Favorites/Regular (50ms 후)
    setTimeout(async () => {
      await Promise.all([
        prefetchFirstPageBasic(),
        prefetchFavorites(),
        prefetchRegular()
      ]);
      
      // 3단계: 전체 첫 페이지 (추가로 200ms 후)
      setTimeout(async () => {
        await prefetchFirstPageFull();
      }, 200);
    }, 50);
  }, [user, prefetchFirstPageCounts, prefetchFirstPageBasic, prefetchFirstPageFull, prefetchFavorites, prefetchRegular]);

  // 마우스 호버 시 사용할 빠른 프리페칭
  const prefetchOnHoverInfinite = useCallback(async () => {
    if (!user) return;
    
    // 카운트, 기본 데이터, Favorites/Regular 동시 프리페칭
    await Promise.all([
      prefetchFirstPageCounts(),
      prefetchFirstPageBasic(),
      prefetchFavorites(),
      prefetchRegular()
    ]);
    
    // 200ms 후 전체 첫 페이지 프리페칭
    setTimeout(() => {
      prefetchFirstPageFull();
    }, 200);
  }, [user, prefetchFirstPageCounts, prefetchFirstPageBasic, prefetchFirstPageFull, prefetchFavorites, prefetchRegular]);

  // 백그라운드 프리페칭 (유휴 시간 활용)
  const prefetchInBackgroundInfinite = useCallback(() => {
    if (!user) return;
    
    // requestIdleCallback이 지원되는 경우 사용, 아니면 setTimeout 사용
    if ('requestIdleCallback' in window) {
      const requestIdleCallback = (window as typeof window & { 
        requestIdleCallback: (callback: () => void, options?: { timeout: number }) => void 
      }).requestIdleCallback;
      
      requestIdleCallback(() => {
        prefetchProgressivelyInfinite();
      }, { timeout: 3000 }); // 3초로 단축 (첫 페이지만이므로 빠름)
    } else {
      setTimeout(() => {
        prefetchProgressivelyInfinite();
      }, 3000);
    }
  }, [user, prefetchProgressivelyInfinite]);

  // 추가 페이지 프리페칭 (사용자가 스크롤을 시작할 것으로 예상될 때)
  const prefetchSecondPage = useCallback(async () => {
    if (!user) return;
    
    try {
      // 첫 페이지가 캐시에 있는지 확인
      const firstPageData = queryClient.getQueryData(libraryInfiniteQueryKeys.combined(20));
      if (!firstPageData) return;
      
      // 두 번째 페이지 프리페칭
      const response = await fetch('/api/canvas/library?limit=20&cursor=page_2');
      if (response.ok) {
        const data = await response.json();
        
        // 수동으로 캐시에 두 번째 페이지 추가
        queryClient.setQueryData(
          libraryInfiniteQueryKeys.combined(20),
          (oldData: { pages: unknown[]; pageParams: unknown[] } | undefined) => {
            if (!oldData || !oldData.pages) return oldData;
            
            return {
              ...oldData,
              pages: [...oldData.pages, data],
              pageParams: [...oldData.pageParams, 'page_2']
            };
          }
        );
      }
    } catch (error) {
      console.warn('Failed to prefetch second page:', error);
    }
  }, [user, queryClient]);

  // 프리페칭 상태 확인
  const getInfinitePrefetchStatus = useCallback(() => {
    return {
      firstPageCounts: prefetchFlags.current.firstPageCounts,
      firstPageBasic: prefetchFlags.current.firstPageBasic,
      firstPageFull: prefetchFlags.current.firstPageFull,
      favorites: prefetchFlags.current.favorites,
      regular: prefetchFlags.current.regular,
      allFirstPagePrefetched: prefetchFlags.current.firstPageCounts && 
                             prefetchFlags.current.firstPageBasic && 
                             prefetchFlags.current.firstPageFull,
      allClipsPrefetched: prefetchFlags.current.favorites && 
                         prefetchFlags.current.regular
    };
  }, []);

  // 프리페칭 플래그 리셋
  const resetInfinitePrefetchFlags = useCallback(() => {
    prefetchFlags.current = {
      firstPageCounts: false,
      firstPageBasic: false,
      firstPageFull: false,
      favorites: false,
      regular: false
    };
  }, []);

  // 스크롤 기반 지능형 프리페칭
  const prefetchOnScroll = useCallback((scrollPercentage: number) => {
    // 사용자가 80% 이상 스크롤했을 때 다음 페이지 프리페칭
    if (scrollPercentage > 0.8) {
      prefetchSecondPage();
    }
  }, [prefetchSecondPage]);

  return {
    // Infinite Query 전용 프리페칭 함수들
    prefetchFirstPageCounts,
    prefetchFirstPageBasic,
    prefetchFirstPageFull,
    prefetchProgressivelyInfinite,
    prefetchSecondPage,
    
    // 클립 전용 프리페칭 함수들
    prefetchFavorites,
    prefetchRegular,
    
    // 상황별 프리페칭 함수들
    prefetchOnHoverInfinite,
    prefetchInBackgroundInfinite,
    prefetchOnScroll,
    
    // 유틸리티 함수들
    getInfinitePrefetchStatus,
    resetInfinitePrefetchFlags,
    
    // 상태
    isEnabled: !!user
  };
}