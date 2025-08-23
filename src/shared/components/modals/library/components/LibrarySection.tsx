'use client';

import { memo } from 'react';
import { Loader2 } from 'lucide-react';
import { LibraryCard } from './LibraryCard';
import { LibraryInfiniteLoader } from './InfiniteScrollLoader';
import { LibraryVideo } from '@/shared/types/video-editor';
import { LibraryModalConfig } from '@/shared/types/library-modal';
import { useLibraryVideoPreload } from '../hooks/useLibraryVideoPreload';

/**
 * LibrarySection 컴포넌트의 Props 타입
 * PROJECT_GUIDE.md 패턴에 따른 명시적 인터페이스 정의
 */
interface LibrarySectionProps {
  /** 섹션 제목 */
  title: string;
  /** 섹션 아이콘 컴포넌트 */
  icon: React.ComponentType<{ className?: string }>;
  /** 표시할 비디오 아이템들 */
  items: LibraryVideo[];
  /** 로딩 상태 */
  loading: boolean;
  /** 에러 상태 - 명시적 Error 타입 또는 null */
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
  /** 추가 CSS 클래스 */
  className?: string;
}

/**
 * LibrarySection 컴포넌트
 * PROJECT_GUIDE.md 컴포넌트 패턴에 따른 명시적 타입 안전성을 보장하는 섹션 컴포넌트
 */
export const LibrarySection = memo(function LibrarySection({
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
  emptyDescription = "Generate videos in Canvas to see them here",
  className = ""
}: LibrarySectionProps) {
  // 비디오 프리로딩 훅 활용
  const { isVideoPreloaded } = useLibraryVideoPreload(items, {
    enabled: items.length > 0,
    topCount: 8 // 상위 8개 카드 우선 프리로드
  });
  // 에러 상태
  if (error) {
    return (
      <div className={`space-y-4 ${className}`}>
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

  // 로딩 상태 (초기 로딩만)
  if (loading && items.length === 0) {
    return (
      <div className={`space-y-4 ${className}`}>
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
      <div className={`space-y-4 ${className}`}>
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

  // 데이터가 있는 경우
  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex items-center gap-3">
        <IconComponent className="w-5 h-5 text-gray-400" />
        <h3 className="text-lg font-medium text-white">{title}</h3>
        <span className="text-sm text-gray-500">({items.length})</span>
      </div>
      
      <div className="grid grid-cols-4 gap-4">
        {items.map((clip, index) => (
          <LibraryCard
            key={clip.id}
            item={clip}
            type="clip"
            isSelected={selectedItems.has(clip.id)}
            selectionOrder={selectedItems.get(clip.id)}
            isFavorite={config.favorites?.favoriteIds?.has(String(clip.id)) || clip.is_favorite}
            isDownloading={downloadingVideos.has(String(clip.id))}
            isVideoPreloaded={isVideoPreloaded(clip.output_video_url)}
            priority={index < 8} // 상위 8개 카드 우선 로딩
            onSelect={config.selection?.enabled && onItemSelect ? () => onItemSelect(clip.id) : undefined}
            onFavoriteToggle={config.favorites?.enabled && onFavoriteToggle ? () => onFavoriteToggle(String(clip.id)) : undefined}
            onDownload={config.download?.enabled && onDownload ? () => onDownload(clip) : undefined}
            theme={config.theme}
          />
        ))}
      </div>
      
      {/* 무한 스크롤 로더 */}
      <LibraryInfiniteLoader
        hasNextPage={hasNextPage}
        isLoadingMore={isFetchingNextPage}
        onLoadMore={onFetchNextPage}
        error={error ? (error as Error).message || String(error) : null}
      />
    </div>
  );
});