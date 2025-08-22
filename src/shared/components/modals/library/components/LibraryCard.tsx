'use client';

import { LibraryVideo, LibraryProject, UserUploadedVideo } from '@/shared/types/video-editor';
import { LibraryModalConfig } from '@/shared/types/library-modal';
import { CARD_CONTAINER_CLASS, getContentFitStyle } from '../utils/constants';
import Image from 'next/image';
import { Download, Loader2, Star, Folder, Upload as UploadIcon, ExternalLink } from 'lucide-react';
import { Tooltip } from '@/shared/components/ui/Tooltip';
import { HoverVideo } from '@/shared/components/ui/hover-video';

interface LibraryCardProps {
  item: LibraryVideo | LibraryProject | UserUploadedVideo;
  type: 'clip' | 'project' | 'upload';
  isSelected?: boolean;
  selectionOrder?: number;
  isFavorite?: boolean;
  isDownloading?: boolean;
  isCurrentProject?: boolean;
  onSelect?: () => void;
  onFavoriteToggle?: () => void;
  onDownload?: () => void;
  onProjectNavigate?: (project: LibraryProject) => void;
  theme?: LibraryModalConfig['theme'];
}

export function LibraryCard({
  item,
  type,
  isSelected = false,
  selectionOrder,
  isFavorite = false,
  isDownloading = false,
  isCurrentProject = false,
  onSelect,
  onFavoriteToggle,
  onDownload,
  onProjectNavigate,
  theme
}: LibraryCardProps) {
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

  const getDate = () => {
    if (type === 'clip') return new Date((item as LibraryVideo).created_at);
    if (type === 'project') return new Date((item as LibraryProject).updated_at);
    if (type === 'upload') return new Date((item as UserUploadedVideo).uploaded_at);
    return new Date();
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
      className={`${CARD_CONTAINER_CLASS} bg-gray-900 rounded-lg overflow-hidden relative transition-all
        ${onSelect ? 'cursor-pointer' : ''}
        ${isCurrentProject 
          ? 'ring-4 ring-red-500 shadow-xl shadow-red-500/30'
          : isSelected 
            ? `ring-2 scale-[0.98]` 
            : onSelect ? 'hover:ring-2 hover:ring-opacity-50' : ''}`}
      style={{
        '--tw-ring-color': isCurrentProject ? undefined : isSelected ? selectionColor : `${selectionColor}80`,
      } as React.CSSProperties}
    >
      {/* Current Project Label */}
      {isCurrentProject && (
        <div className="absolute top-0 left-0 right-0 z-20 bg-red-500 text-white text-xs font-bold text-center py-1 shadow-lg">
          CURRENT PROJECT
        </div>
      )}
      
      <div className="relative h-full group">
        {/* Video or Thumbnail Preview */}
        {videoUrl ? (
          <HoverVideo 
            src={videoUrl}
            className={`w-full h-full ${contentFitClass}`}
          />
        ) : thumbnailUrl ? (
          <Image 
            src={thumbnailUrl} 
            alt={title || 'Library item'} 
            className={`w-full h-full ${contentFitClass}`}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
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
        
        {/* Top-right buttons */}
        <div className="absolute top-2 right-2 flex flex-col gap-2">
          {/* Open project button - only for projects that are NOT current */}
          {type === 'project' && onProjectNavigate && !isCurrentProject && (
            <Tooltip text="Open Project" position="bottom">
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  onProjectNavigate(item as LibraryProject);
                }}
                className="bg-black/60 p-1.5 rounded-full hover:bg-black/80 transition-colors"
              >
                <ExternalLink className="w-5 h-5 text-white/70 hover:text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]" />
              </button>
            </Tooltip>
          )}
          
          {/* Download button */}
          {onDownload && (
            <Tooltip text={isDownloading ? "Downloading..." : "Download"} position="bottom">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDownload();
                }}
                disabled={isDownloading}
                className="bg-black/60 p-1.5 rounded-full hover:bg-black/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isDownloading ? (
                  <Loader2 className="w-5 h-5 animate-spin text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]" />
                ) : (
                  <Download className="w-5 h-5 text-white/70 hover:text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]" />
                )}
              </button>
            </Tooltip>
          )}
          
          {/* Favorite button */}
          {onFavoriteToggle && type === 'clip' && (
            <Tooltip text={isFavorite ? "Remove from Favorites" : "Add to Favorites"} position="bottom">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onFavoriteToggle();
                }}
                className="bg-black/60 p-1.5 rounded-full hover:bg-black/80 transition-colors"
              >
                <Star className={`w-5 h-5 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] ${
                  isFavorite
                    ? "text-yellow-400 fill-current"
                    : "text-white/70 hover:text-white"
                }`} />
              </button>
            </Tooltip>
          )}
        </div>
        
        {/* Info overlay - Unified for all types */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black via-black/80 to-transparent p-3">
          {/* Title for all types */}
          {title && (
            <h4 className="text-sm font-medium text-white truncate">
              {title}
            </h4>
          )}
          
          {/* Date only */}
          <div className="text-[10px] text-gray-400 mt-1">
            {getDate().toLocaleDateString()}
          </div>
        </div>
      </div>
    </div>
  );
}