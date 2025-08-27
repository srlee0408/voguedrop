'use client';

import { useMemo, useCallback, useRef, useEffect } from 'react';
import { VirtualItem } from '@tanstack/react-virtual';
import { LibraryVideo, LibraryProject, UserUploadedVideo } from '@/shared/types/video-editor';
import { useVideoPreloader } from '@/app/video-editor/_hooks/useVideoPreloader';

/**
 * Library 아이템 타입 유니언
 */
type LibraryItem = LibraryVideo | LibraryProject | UserUploadedVideo;

/**
 * Virtual List 기반 스마트 비디오 프리로딩 훅
 * Midjourney 스타일의 예측형 로딩으로 끊김 없는 경험 제공
 */
interface UseLibrarySmartPreloadOptions {
  /** 활성화 여부 */
  enabled?: boolean;
  /** 우선 프리로딩할 상위 아이템 수 */
  topCount?: number;
  /** 예측 프리로딩을 위한 추가 행 수 */
  predictiveRows?: number;
  /** 스크롤 방향 감지 여부 */
  directionalPreload?: boolean;
}

interface UseLibrarySmartPreloadReturn {
  /** 비디오가 프리로드되었는지 확인 */
  isVideoPreloaded: (url: string | undefined) => boolean;
  /** 프리로딩 통계 */
  preloadStats: {
    loading: number;
    loaded: number;
    total: number;
    allLoaded: boolean;
  };
  /** 스크롤 방향 */
  scrollDirection: 'up' | 'down' | 'idle';
}

export function useLibrarySmartPreload<T extends LibraryItem>(
  rows: T[][],
  virtualItems: VirtualItem[],
  options: UseLibrarySmartPreloadOptions = {}
): UseLibrarySmartPreloadReturn {
  const {
    enabled = true,
    topCount = 8,
    predictiveRows = 2,
    directionalPreload = true,
  } = options;

  // 스크롤 방향 감지를 위한 ref
  const lastScrollTopRef = useRef<number>(0);
  const scrollDirectionRef = useRef<'up' | 'down' | 'idle'>('idle');

  // 스크롤 방향 감지 로직
  useEffect(() => {
    const updateScrollDirection = () => {
      if (!virtualItems.length) return;
      
      const currentScrollTop = virtualItems[0]?.start || 0;
      const lastScrollTop = lastScrollTopRef.current;
      
      if (currentScrollTop > lastScrollTop + 10) {
        scrollDirectionRef.current = 'down';
      } else if (currentScrollTop < lastScrollTop - 10) {
        scrollDirectionRef.current = 'up';
      } else {
        scrollDirectionRef.current = 'idle';
      }
      
      lastScrollTopRef.current = currentScrollTop;
    };

    updateScrollDirection();
  }, [virtualItems]);

  // 비디오 URL 추출 헬퍼 함수
  const getVideoUrl = useCallback((item: T): string | undefined => {
    if ('output_video_url' in item) {
      return (item as LibraryVideo).output_video_url;
    }
    if ('latest_video_url' in item) {
      return (item as LibraryProject).latest_video_url;
    }
    if ('url' in item) {
      return (item as UserUploadedVideo & { url?: string }).url;
    }
    return undefined;
  }, []);

  // 스마트 프리로딩 대상 URL 계산
  const targetVideoUrls = useMemo(() => {
    if (!enabled || !rows.length) return [];

    const urls: (string | undefined)[] = [];
    
    // 1. 상위 우선 항목 (항상 프리로드)
    const topItems = rows.slice(0, Math.ceil(topCount / 4));
    topItems.forEach(row => {
      row.forEach(item => {
        const videoUrl = getVideoUrl(item);
        if (videoUrl) urls.push(videoUrl);
      });
    });

    // 2. 현재 가시 영역
    virtualItems.forEach(virtualItem => {
      const row = rows[virtualItem.index];
      if (row) {
        row.forEach(item => {
          const videoUrl = getVideoUrl(item);
          if (videoUrl) urls.push(videoUrl);
        });
      }
    });

    // 3. 예측 영역 (스크롤 방향 기반)
    if (virtualItems.length > 0 && directionalPreload) {
      const scrollDirection = scrollDirectionRef.current;
      
      if (scrollDirection === 'down') {
        // 아래쪽 스크롤: 다음 행들 예측 로드
        const lastVisibleIndex = Math.max(...virtualItems.map(item => item.index));
        const predictiveEndIndex = Math.min(lastVisibleIndex + predictiveRows, rows.length - 1);
        
        for (let i = lastVisibleIndex + 1; i <= predictiveEndIndex; i++) {
          const row = rows[i];
          if (row) {
            row.forEach(item => {
              const videoUrl = getVideoUrl(item);
              if (videoUrl) urls.push(videoUrl);
            });
          }
        }
      } else if (scrollDirection === 'up') {
        // 위쪽 스크롤: 이전 행들 예측 로드
        const firstVisibleIndex = Math.min(...virtualItems.map(item => item.index));
        const predictiveStartIndex = Math.max(firstVisibleIndex - predictiveRows, 0);
        
        for (let i = predictiveStartIndex; i < firstVisibleIndex; i++) {
          const row = rows[i];
          if (row) {
            row.forEach(item => {
              const videoUrl = getVideoUrl(item);
              if (videoUrl) urls.push(videoUrl);
            });
          }
        }
      }
    }

    // 중복 제거하고 순서 유지
    return Array.from(new Set(urls.filter(Boolean)));
  }, [rows, virtualItems, enabled, topCount, predictiveRows, directionalPreload, getVideoUrl]);

  // 기존 비디오 프리로더 재사용
  const { preloadStatus, allLoaded, loadingCount, loadedCount, totalCount } = useVideoPreloader(
    targetVideoUrls
  );

  // 특정 URL이 프리로드되었는지 확인
  const isVideoPreloaded = useCallback((url: string | undefined): boolean => {
    if (!url || !enabled) return false;
    return preloadStatus[url]?.loaded || false;
  }, [preloadStatus, enabled]);

  // 통계 정보
  const preloadStats = useMemo(() => ({
    loading: loadingCount,
    loaded: loadedCount,
    total: totalCount,
    allLoaded,
  }), [loadingCount, loadedCount, totalCount, allLoaded]);

  return {
    isVideoPreloaded,
    preloadStats,
    scrollDirection: scrollDirectionRef.current,
  };
}

/**
 * 개별 카드의 Intersection Observer 기반 프리로딩
 * 카드가 뷰포트에 진입하기 전에 미리 로딩
 */
interface UseCardIntersectionPreloadOptions {
  /** 프리로딩을 트리거할 root margin */
  rootMargin?: string;
  /** Intersection threshold */
  threshold?: number;
  /** 활성화 여부 */
  enabled?: boolean;
}

export function useCardIntersectionPreload(
  videoUrl: string | undefined,
  options: UseCardIntersectionPreloadOptions = {}
): {
  cardRef: (element: HTMLElement | null) => void;
  shouldPreload: boolean;
} {
  const {
    rootMargin = '200px',
    threshold = 0.1,
    enabled = true,
  } = options;

  const shouldPreloadRef = useRef(false);

  const cardRef = useCallback((element: HTMLElement | null) => {
    if (!element || !enabled || !videoUrl) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting) {
          shouldPreloadRef.current = true;
          observer.disconnect(); // 한 번만 트리거
        }
      },
      {
        rootMargin,
        threshold,
      }
    );

    observer.observe(element);

    return () => observer.disconnect();
  }, [videoUrl, enabled, rootMargin, threshold]);

  return {
    cardRef,
    shouldPreload: shouldPreloadRef.current,
  };
}