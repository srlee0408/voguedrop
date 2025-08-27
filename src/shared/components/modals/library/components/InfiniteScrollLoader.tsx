'use client';

import React, { useRef, useEffect } from 'react';
import { Loader2 } from 'lucide-react';

interface InfiniteScrollLoaderProps {
  /** 더 많은 데이터를 로드할 수 있는지 여부 */
  hasNextPage: boolean;
  /** 현재 로딩 중인지 여부 */
  isLoadingMore: boolean;
  /** 더 많은 데이터를 로드하는 함수 */
  onLoadMore: () => void;
  /** Intersection Observer 설정 */
  observerOptions?: IntersectionObserverInit;
  /** 커스텀 로딩 컴포넌트 */
  loadingComponent?: React.ReactNode;
  /** 모든 데이터 로드 완료 시 표시할 메시지 */
  endMessage?: React.ReactNode;
  /** 에러 상태 */
  error?: string | null;
}

/**
 * 무한 스크롤을 위한 로딩 컴포넌트
 * Intersection Observer를 사용하여 자동으로 다음 페이지를 로드합니다.
 */
export function InfiniteScrollLoader({
  hasNextPage,
  isLoadingMore,
  onLoadMore,
  observerOptions = {
    threshold: 0.1,
    rootMargin: '100px'
  },
  loadingComponent,
  error
}: InfiniteScrollLoaderProps) {
  const observerTargetRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    const target = observerTargetRef.current;
    if (!target || !hasNextPage || isLoadingMore) return;

    // 기존 Observer 정리
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    // 새 Observer 생성
    observerRef.current = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting && hasNextPage && !isLoadingMore) {
          onLoadMore();
        }
      },
      observerOptions
    );

    // 타겟 관찰 시작
    observerRef.current.observe(target);

    // 클린업
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
        observerRef.current = null;
      }
    };
  }, [hasNextPage, isLoadingMore, onLoadMore, observerOptions]);

  // 에러 상태 렌더링
  if (error) {
    return (
      <div className="flex items-center justify-center py-8 text-destructive">
        <div className="text-center">
          <p className="text-sm font-medium">Error loading data</p>
          <p className="text-xs text-muted-foreground mt-1">{error}</p>
          <button
            onClick={onLoadMore}
            className="mt-3 px-4 py-2 text-xs bg-destructive text-destructive-foreground rounded-md hover:bg-destructive/90 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // 모든 데이터 로드 완료
  if (!hasNextPage) {
    return null;
  }

  // 로딩 상태
  if (isLoadingMore) {
    return (
      <div className="flex items-center justify-center py-8">
        {loadingComponent || (
          <div className="flex items-center gap-3 text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-sm font-medium">Loading more items...</span>
          </div>
        )}
      </div>
    );
  }

  // Intersection Observer 타겟 (투명한 div)
  return (
    <div 
      ref={observerTargetRef}
      className="h-4 w-full"
      aria-hidden="true"
    />
  );
}

// 프리셋 컴포넌트들
export function LibraryInfiniteLoader(props: Omit<InfiniteScrollLoaderProps, 'endMessage'>) {
  return (
    <InfiniteScrollLoader
      {...props}
    />
  );
}

// 컴팩트 버전 (작은 공간용)
export function CompactInfiniteLoader(props: InfiniteScrollLoaderProps) {
  return (
    <InfiniteScrollLoader
      {...props}
      loadingComponent={
        <div className="flex items-center justify-center gap-2 text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-xs">Loading...</span>
        </div>
      }
    />
  );
}

// 좌측 상단 고정 로더 (성능 최적화 버전)
export function FixedTopLeftLoader({ 
  isLoading, 
  message = "Loading more...",
  className = ""
}: {
  isLoading: boolean;
  message?: string;
  className?: string;
}) {
  if (!isLoading) return null;

  return (
    <div className={`fixed top-4 left-4 z-[9998] bg-gray-800/90 backdrop-blur-sm rounded-lg px-3 py-2 flex items-center gap-2 shadow-lg pointer-events-none ${className}`}>
      <Loader2 className="w-4 h-4 animate-spin text-primary" />
      <span className="text-sm text-gray-300">{message}</span>
    </div>
  );
}