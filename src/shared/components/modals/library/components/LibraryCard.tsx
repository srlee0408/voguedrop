'use client';

import { LibraryVideo, LibraryProject, UserUploadedVideo } from '@/shared/types/video-editor';
import { LibraryModalConfig } from '@/shared/types/library-modal';
import { CARD_CONTAINER_CLASS, getContentFitStyle } from '../utils/constants';
import Image from 'next/image';
import { Loader2, Folder, Upload as UploadIcon } from 'lucide-react';
import { HoverVideo } from '@/shared/components/ui/hover-video';
import { useState, memo } from 'react';

interface LibraryCardProps {
  item: LibraryVideo | LibraryProject | UserUploadedVideo;
  type: 'clip' | 'project' | 'upload';
  isSelected?: boolean;
  selectionOrder?: number;
  isCurrentProject?: boolean;
  isVideoPreloaded?: boolean;
  priority?: boolean;
  onSelect?: () => void;
  theme?: LibraryModalConfig['theme'];
}

export const LibraryCard = memo(function LibraryCard({
  item,
  type,
  isSelected = false,
  selectionOrder,
  isCurrentProject = false,
  isVideoPreloaded = false,
  priority = false,
  onSelect,
  theme
}: LibraryCardProps) {
  const [isHovering, setIsHovering] = useState(false);
  const [isVideoBuffering, setIsVideoBuffering] = useState(false);

  // 타입별 데이터 접근
  const getAspectRatio = () => {
    if (type === 'clip') return (item as LibraryVideo).aspect_ratio || '9:16';
    if (type === 'project') return (item as LibraryProject).content_snapshot?.aspect_ratio || '16:9';
    if (type === 'upload') return (item as UserUploadedVideo).aspect_ratio || '16:9';
    return '16:9';
  };

  const getVideoUrl = () => {
    if (type === 'clip') return (item as LibraryVideo).output_video_url;
    if (type === 'project') return (item as LibraryProject).latest_video_url;
    if (type === 'upload') return (item as UserUploadedVideo & { url?: string }).url;
    return undefined;
  };

  const getThumbnailUrl = () => {
    if (type === 'clip') return (item as LibraryVideo).input_image_url;
    if (type === 'project') return (item as LibraryProject).thumbnail_url;
    if (type === 'upload') return (item as UserUploadedVideo).thumbnail_url;
    return undefined;
  };

  const getTitle = () => {
    if (type === 'clip') {
      const clip = item as LibraryVideo;
      return clip.selected_effects?.[0]?.name || 'Video';
    }
    if (type === 'project') return (item as LibraryProject).project_name;
    if (type === 'upload') return (item as UserUploadedVideo).file_name;
    return undefined;
  };

  const contentFitClass = getContentFitStyle(getAspectRatio());
  const videoUrl = getVideoUrl();
  const thumbnailUrl = getThumbnailUrl();
  const title = getTitle();
  const selectionColor = theme?.selectionColor || '#38f47cf9';

  // 카드 클릭 핸들러
  const handleCardClick = () => {
    if (onSelect) {
      onSelect();
    }
  };

  // 아이콘 렌더링
  const renderPlaceholderIcon = () => {
    switch(type) {
      case 'clip':
        return <i className="ri-video-line text-4xl text-gray-600"></i>;
      case 'project':
        return <Folder className="w-12 h-12 text-gray-600" />;
      case 'upload':
        return <UploadIcon className="w-12 h-12 text-gray-600" />;
    }
  };

  return (
    <div 
      onClick={handleCardClick}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => {
        setIsHovering(false);
        setIsVideoBuffering(false);
      }}
      className={`${CARD_CONTAINER_CLASS} bg-gray-900 rounded-t-lg overflow-hidden relative transition-all
        ${onSelect ? 'cursor-pointer' : ''}
        ${isCurrentProject ? 'ring-4 ring-red-500 shadow-xl shadow-red-500/30' : ''}`}
      style={{
        '--tw-ring-color': isCurrentProject ? undefined : selectionColor,
      } as React.CSSProperties}
    >
      {/* Current Project Label */}
      {isCurrentProject && (
        <div className="absolute top-0 left-0 right-0 z-20 bg-red-500 text-white text-xs font-bold text-center py-1 shadow-lg">
          CURRENT PROJECT
        </div>
      )}
      
      <div className="relative h-full group flex items-center justify-center bg-black">
        {/* Library Modal 방식: HoverVideo에서 썸네일과 비디오를 모두 처리 */}
        {videoUrl && thumbnailUrl ? (
          <HoverVideo 
            src={videoUrl}
            thumbnailSrc={thumbnailUrl}
            className={`w-full h-full ${contentFitClass}`}
            showMode="thumbnail-first"
            pauseMode="stop"
            thumbnailObjectFit="contain"
            isParentHovering={isHovering}
            isPreloaded={isVideoPreloaded}
            onLoading={setIsVideoBuffering}
          />
        ) : thumbnailUrl ? (
          <Image 
            src={thumbnailUrl} 
            alt={title || 'Library item'} 
            className={`w-full h-full ${contentFitClass}`}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            priority={priority}
          />
        ) : (
          <div className="w-full h-full bg-gray-800 flex items-center justify-center">
            {renderPlaceholderIcon()}
          </div>
        )}
        
        {/* Selection number indicator */}
        {isSelected && selectionOrder && (
          <div 
            className="absolute top-2 right-2 w-8 h-8 rounded-full flex items-center justify-center text-black font-bold text-sm z-10"
            style={{ backgroundColor: selectionColor }}
          >
            {selectionOrder}
          </div>
        )}
        
        {/* Video Loading Indicator - Center */}
        {isHovering && isVideoBuffering && (
          <div className="absolute inset-0 flex items-center justify-center z-10">
            <div className="bg-black/70 p-3 rounded-full flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-white" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
});

LibraryCard.displayName = 'LibraryCard';