import { useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { LIBRARY_CACHE_KEYS } from '@/features/media-library/_components/constants/cache-keys';
import { useAuth } from '@/features/user-auth/_context/AuthContext';
import { fetchLibraryCounts } from '@/features/media-library/_components/_services/api';

// 프리페칭 상태 추적을 위한 플래그
interface PrefetchFlags {
  counts: boolean;
  basicData: boolean;
  fullData: boolean;
}

/**
 * Library Modal 데이터 프리페칭을 위한 훅
 * 사용자 인터랙션을 예측하여 미리 데이터를 캐시에 로드합니다.
 */
export function useLibraryPrefetch() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const prefetchFlags = useRef<PrefetchFlags>({
    counts: false,
    basicData: false,
    fullData: false
  });

  // API 함수들 (서비스 사용)
  const fetchBasicLibraryData = async () => {
    const params = new URLSearchParams({ limit: '20' });
    const res = await fetch(`/api/canvas/library?${params.toString()}`, {
      headers: { 'Cache-Control': 'no-store' },
      cache: 'no-store',
    });
    if (!res.ok) throw new Error('Failed to fetch basic library data');
    return res.json();
  };

  const fetchFullLibraryData = async () => {
    const params = new URLSearchParams({ limit: '50' });
    const res = await fetch(`/api/canvas/library?${params.toString()}`, {
      headers: { 'Cache-Control': 'no-store' },
      cache: 'no-store',
    });
    if (!res.ok) throw new Error('Failed to fetch full library data');
    return res.json();
  };

  // 1단계: 카운트 정보만 프리페칭 (가장 가벼운 데이터)
  const prefetchCounts = useCallback(async () => {
    if (!user || prefetchFlags.current.counts) return;
    
    try {
      await queryClient.prefetchQuery({
        queryKey: [...LIBRARY_CACHE_KEYS.combined.all(), 'counts'],
        queryFn: fetchLibraryCounts,
        staleTime: 10 * 60 * 1000, // 10분간 fresh
      });
      prefetchFlags.current.counts = true;
    } catch (error) {
      console.warn('Failed to prefetch library counts:', error);
    }
  }, [user, queryClient]);

  // 2단계: 기본 데이터 프리페칭 (첫 20개 아이템)
  const prefetchBasicData = useCallback(async () => {
    if (!user || prefetchFlags.current.basicData) return;
    
    try {
      await queryClient.prefetchQuery({
        queryKey: LIBRARY_CACHE_KEYS.combined.all(20),
        queryFn: fetchBasicLibraryData,
        staleTime: 15 * 60 * 1000, // 15분간 fresh
      });
      prefetchFlags.current.basicData = true;
    } catch (error) {
      console.warn('Failed to prefetch basic library data:', error);
    }
  }, [user, queryClient]);

  // 3단계: 전체 데이터 프리페칭 (모든 아이템)
  const prefetchFullData = useCallback(async () => {
    if (!user || prefetchFlags.current.fullData) return;
    
    try {
      await queryClient.prefetchQuery({
        queryKey: LIBRARY_CACHE_KEYS.combined.all(50),
        queryFn: fetchFullLibraryData,
        staleTime: 30 * 60 * 1000, // 30분간 fresh
      });
      prefetchFlags.current.fullData = true;
    } catch (error) {
      console.warn('Failed to prefetch full library data:', error);
    }
  }, [user, queryClient]);

  // Progressive Enhancement 프리페칭
  const prefetchProgressively = useCallback(async () => {
    if (!user) return;
    
    // 1단계: 카운트 (즉시)
    await prefetchCounts();
    
    // 2단계: 기본 데이터 (100ms 후)
    setTimeout(async () => {
      await prefetchBasicData();
      
      // 3단계: 전체 데이터 (추가로 500ms 후)
      setTimeout(async () => {
        await prefetchFullData();
      }, 500);
    }, 100);
  }, [user, prefetchCounts, prefetchBasicData, prefetchFullData]);

  // 마우스 호버 시 사용할 빠른 프리페칭
  const prefetchOnHover = useCallback(async () => {
    if (!user) return;
    
    // 카운트와 기본 데이터 동시 프리페칭
    await Promise.all([
      prefetchCounts(),
      prefetchBasicData()
    ]);
  }, [user, prefetchCounts, prefetchBasicData]);

  // 백그라운드 프리페칭 (유휴 시간 활용)
  const prefetchInBackground = useCallback(() => {
    if (!user) return;
    
    // requestIdleCallback이 지원되는 경우 사용, 아니면 setTimeout 사용
    if ('requestIdleCallback' in window) {
      const requestIdleCallback = (window as typeof window & { 
        requestIdleCallback: (callback: () => void, options?: { timeout: number }) => void 
      }).requestIdleCallback;
      
      requestIdleCallback(() => {
        prefetchProgressively();
      }, { timeout: 5000 });
    } else {
      setTimeout(() => {
        prefetchProgressively();
      }, 5000);
    }
  }, [user, prefetchProgressively]);

  // 프리페칭 상태 확인
  const getPrefetchStatus = useCallback(() => {
    return {
      counts: prefetchFlags.current.counts,
      basicData: prefetchFlags.current.basicData,
      fullData: prefetchFlags.current.fullData,
      allPrefetched: prefetchFlags.current.counts && 
                    prefetchFlags.current.basicData && 
                    prefetchFlags.current.fullData
    };
  }, []);

  // 프리페칭 플래그 리셋 (예: 사용자 로그아웃 시)
  const resetPrefetchFlags = useCallback(() => {
    prefetchFlags.current = {
      counts: false,
      basicData: false,
      fullData: false
    };
  }, []);

  return {
    // 단계별 프리페칭 함수들
    prefetchCounts,
    prefetchBasicData,
    prefetchFullData,
    prefetchProgressively,
    
    // 상황별 프리페칭 함수들
    prefetchOnHover,
    prefetchInBackground,
    
    // 유틸리티 함수들
    getPrefetchStatus,
    resetPrefetchFlags,
    
    // 상태
    isEnabled: !!user
  };
}