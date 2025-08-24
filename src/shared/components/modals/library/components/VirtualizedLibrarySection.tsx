'use client';

import { memo, useMemo, useRef, useEffect, useCallback } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Loader2 } from 'lucide-react';
import { LibraryCard } from './LibraryCard';
import { LibraryCardActions } from './LibraryCardActions';
import { LibraryVideo } from '@/shared/types/video-editor';
import { LibraryModalConfig } from '@/shared/types/library-modal';
import { useLibraryVideoPreload } from '../hooks/useLibraryVideoPreload';

/**
 * VirtualizedLibrarySection 컴포넌트의 Props
 * 가상 스크롤링으로 대용량 데이터를 효율적으로 렌더링
 */
interface VirtualizedLibrarySectionProps {
  /** 섹션 제목 */
  title: string;
  /** 섹션 아이콘 컴포넌트 */
  icon: React.ComponentType<{ className?: string }>;
  /** 표시할 비디오 아이템들 */
  items: LibraryVideo[];
  /** 로딩 상태 */
  loading: boolean;
  /** 에러 상태 */
  error: Error | null;
  /** 다음 페이지 존재 여부 */
  hasNextPage: boolean;
  /** 다음 페이지 로딩 중 여부 */
  isFetchingNextPage: boolean;
  /** 다음 페이지 가져오기 함수 */
  onFetchNextPage: () => Promise<void>;
  /** 라이브러리 모달 설정 */
  config: LibraryModalConfig;
  /** 선택된 아이템들 맵 */
  selectedItems: Map<string, number>;
  /** 다운로드 중인 비디오들 Set */
  downloadingVideos: Set<string>;
  /** 아이템 선택 핸들러 */
  onItemSelect?: (itemId: string) => void;
  /** 즐겨찾기 토글 핸들러 */
  onFavoriteToggle?: (videoId: string) => void;
  /** 다운로드 핸들러 */
  onDownload?: (item: LibraryVideo) => void;
  /** 빈 상태 메시지 */
  emptyMessage?: string;
  /** 빈 상태 설명 */
  emptyDescription?: string;
  /** 고정 로딩 위치 (좌측 상단) */
  showFixedLoader?: boolean;
}

// 그리드 설정 상수
const GRID_COLUMNS = 4;
const ITEM_HEIGHT = 300; // 카드 높이 + 액션 높이 + 여백
const OVERSCAN = 3; // 화면 밖 렌더링할 행 수

/**
 * 가상화된 라이브러리 섹션 컴포넌트
 * 대용량 데이터에서도 60fps 성능을 유지하기 위한 가상 스크롤링 적용
 */
export const VirtualizedLibrarySection = memo(function VirtualizedLibrarySection({
  title,
  icon: IconComponent,
  items,
  loading,
  error,
  hasNextPage,
  isFetchingNextPage,
  onFetchNextPage,
  config,
  selectedItems,
  downloadingVideos,
  onItemSelect,
  onFavoriteToggle,
  onDownload,
  emptyMessage = "No clips found",
  emptyDescription = "Generate videos in Canvas to see them here"
}: VirtualizedLibrarySectionProps) {
  const parentRef = useRef<HTMLDivElement>(null);
  
  // 행 단위로 아이템 그룹화 (4개씩)
  const itemRows = useMemo(() => {
    const rows: LibraryVideo[][] = [];
    for (let i = 0; i < items.length; i += GRID_COLUMNS) {
      rows.push(items.slice(i, i + GRID_COLUMNS));
    }
    return rows;
  }, [items]);

  // 가상화 설정
  const rowVirtualizer = useVirtualizer({
    count: itemRows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ITEM_HEIGHT,
    overscan: OVERSCAN,
    measureElement: (element) => {
      // 실제 DOM 요소 높이 측정하여 정확한 높이 계산
      const height = element?.getBoundingClientRect().height;
      return height || ITEM_HEIGHT;
    },
  });

  // 비디오 프리로딩 (가상화된 아이템 기준)
  const virtualItems = rowVirtualizer.getVirtualItems();
  const visibleItems = useMemo(() => {
    return virtualItems
      .flatMap(virtualItem => itemRows[virtualItem.index] || [])
      .filter(Boolean);
  }, [virtualItems, itemRows]);

  const { isVideoPreloaded } = useLibraryVideoPreload(visibleItems, {
    enabled: visibleItems.length > 0,
    topCount: 8 // 상위 8개 우선 프리로드
  });

  // 무한 스크롤 감지
  const handleScroll = useCallback(() => {
    if (!parentRef.current) return;
    
    const { scrollTop, scrollHeight, clientHeight } = parentRef.current;
    const scrollPercentage = (scrollTop + clientHeight) / scrollHeight;
    
    // 85% 스크롤 시 다음 페이지 로드
    if (scrollPercentage > 0.85 && hasNextPage && !isFetchingNextPage && !loading) {
      onFetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, loading, onFetchNextPage]);

  // 스크롤 이벤트 리스너 등록
  useEffect(() => {
    const scrollElement = parentRef.current;
    if (!scrollElement) return;

    scrollElement.addEventListener('scroll', handleScroll, { passive: true });
    return () => scrollElement.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  // 에러 상태
  if (error) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <IconComponent className="w-5 h-5 text-gray-400" />
          <h3 className="text-lg font-medium text-white">{title}</h3>
        </div>
        <div className="flex items-center justify-center py-12 text-red-400">
          <div className="text-center">
            <p className="text-sm font-medium">Error loading data</p>
            <p className="text-xs text-gray-500 mt-1">{error.message}</p>
          </div>
        </div>
      </div>
    );
  }

  // 초기 로딩 상태
  if (loading && items.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <IconComponent className="w-5 h-5 text-gray-400" />
          <h3 className="text-lg font-medium text-white">{title}</h3>
        </div>
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-gray-400 mx-auto mb-4" />
            <p className="text-gray-400 text-sm">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  // 빈 상태
  if (!loading && items.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <IconComponent className="w-5 h-5 text-gray-400" />
          <h3 className="text-lg font-medium text-white">{title}</h3>
          <span className="text-sm text-gray-500">(0)</span>
        </div>
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <IconComponent className="w-12 h-12 text-gray-500 mx-auto mb-4" />
            <p className="text-gray-400">{emptyMessage}</p>
            <p className="text-sm text-gray-500 mt-2">{emptyDescription}</p>
          </div>
        </div>
      </div>
    );
  }

  // 가상화된 그리드 렌더링
  return (
    <div className="space-y-4 relative">
      {/* 전역 로딩 인디케이터 제거 - 개별 카드에서 처리 */}

      <div className="flex items-center gap-3">
        <IconComponent className="w-5 h-5 text-gray-400" />
        <h3 className="text-lg font-medium text-white">{title}</h3>
        <span className="text-sm text-gray-500">({items.length})</span>
        {hasNextPage && (
          <span className="text-xs text-gray-600">• more available</span>
        )}
      </div>
      
      <div 
        ref={parentRef}
        className="overflow-auto h-[600px] w-full" // 고정 높이로 스크롤 가능
        style={{
          contain: 'strict', // CSS containment for better performance
        }}
      >
        <div
          style={{
            height: `${rowVirtualizer.getTotalSize()}px`,
            width: '100%',
            position: 'relative',
          }}
        >
          {rowVirtualizer.getVirtualItems().map((virtualRow) => {
            const rowItems = itemRows[virtualRow.index] || [];
            
            return (
              <div
                key={virtualRow.key}
                data-index={virtualRow.index}
                ref={rowVirtualizer.measureElement}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  transform: `translateY(${virtualRow.start}px)`,
                }}
                className="grid grid-cols-4 gap-4 px-1"
              >
                {rowItems.map((clip, colIndex) => {
                  const globalIndex = virtualRow.index * GRID_COLUMNS + colIndex;
                  const isSelected = selectedItems.has(clip.id);
                  const selectionOrder = selectedItems.get(clip.id);
                  const selectionColor = config.theme?.selectionColor || '#38f47cf9';
                  
                  return (
                    <div 
                      key={clip.id}
                      className={`flex flex-col rounded-lg overflow-hidden transition-all
                        ${isSelected 
                          ? `ring-2 scale-[0.98]` 
                          : config.selection?.enabled ? 'hover:ring-2 hover:ring-opacity-50' : ''}`}
                      style={{
                        '--tw-ring-color': isSelected ? selectionColor : `${selectionColor}80`,
                      } as React.CSSProperties}
                    >
                      <LibraryCard
                        item={clip}
                        type="clip"
                        isSelected={isSelected}
                        selectionOrder={selectionOrder}
                        isVideoPreloaded={isVideoPreloaded(clip.output_video_url)}
                        priority={globalIndex < 8} // 상위 8개 우선 로딩
                        onSelect={config.selection?.enabled && onItemSelect ? () => onItemSelect(clip.id) : undefined}
                        theme={config.theme}
                      />
                      <LibraryCardActions
                        item={clip}
                        type="clip"
                        isFavorite={clip.is_favorite}
                        isDownloading={downloadingVideos.has(String(clip.id))}
                        onFavoriteToggle={config.favorites?.enabled && onFavoriteToggle ? () => onFavoriteToggle(String(clip.id)) : undefined}
                        onDownload={config.download?.enabled && onDownload ? () => onDownload(clip) : undefined}
                        theme={config.theme}
                      />
                    </div>
                  );
                })}
                
                {/* 빈 슬롯 채우기 (행의 마지막 부분) */}
                {Array.from({ length: GRID_COLUMNS - rowItems.length }).map((_, emptyIndex) => (
                  <div key={`empty-${virtualRow.index}-${emptyIndex}`} className="opacity-0" />
                ))}
              </div>
            );
          })}
        </div>
      </div>
      
      {/* 성능 디버깅 정보 (개발 모드) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="text-xs text-gray-600 mt-2">
          Virtual rows: {rowVirtualizer.getVirtualItems().length} / {itemRows.length}
          {' • '}
          Visible items: {visibleItems.length} / {items.length}
        </div>
      )}
    </div>
  );
});