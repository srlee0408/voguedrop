'use client';

import { memo } from 'react';
import { Download, Loader2, Star, ExternalLink } from 'lucide-react';
import { Tooltip } from '@/shared/components/ui/Tooltip';
import { LibraryVideo, LibraryProject, UserUploadedVideo } from '@/shared/types/video-editor';
import { LibraryModalConfig } from '@/shared/types/library-modal';

interface LibraryCardActionsProps {
  item: LibraryVideo | LibraryProject | UserUploadedVideo;
  type: 'clip' | 'project' | 'upload';
  isFavorite?: boolean;
  isDownloading?: boolean;
  isCurrentProject?: boolean;
  onFavoriteToggle?: () => void;
  onDownload?: () => void;
  onProjectNavigate?: (project: LibraryProject) => void;
  theme?: LibraryModalConfig['theme'];
}

export const LibraryCardActions = memo(function LibraryCardActions({
  item,
  type,
  isFavorite = false,
  isDownloading = false,
  isCurrentProject = false,
  onFavoriteToggle,
  onDownload,
  onProjectNavigate,
  theme
}: LibraryCardActionsProps) {
  // 타입별 데이터 접근
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

  const title = getTitle();

  return (
    <div className="bg-gray-900 p-3 rounded-b-lg">
      {/* 제목과 날짜 */}
      <div className="mb-2">
        {title && (
          <h4 className="text-sm font-medium text-white truncate mb-1">
            {title}
          </h4>
        )}
        <div className="text-[10px] text-gray-400">
          {getDate().toLocaleDateString()}
        </div>
      </div>

      {/* 액션 버튼들 */}
      <div className="flex items-center justify-end gap-2">
        {/* 프로젝트 열기 버튼 - 현재 프로젝트가 아닌 경우에만 */}
        {type === 'project' && onProjectNavigate && !isCurrentProject && (
          <Tooltip text="Open Project" position="top">
            <button 
              onClick={(e) => {
                e.stopPropagation();
                onProjectNavigate(item as LibraryProject);
              }}
              className="p-1.5 rounded-md bg-gray-800 hover:bg-gray-700 transition-colors"
            >
              <ExternalLink className="w-4 h-4 text-gray-400 hover:text-white" />
            </button>
          </Tooltip>
        )}
        
        {/* 다운로드 버튼 */}
        {onDownload && (
          <Tooltip text={isDownloading ? "Downloading..." : "Download"} position="top">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDownload();
              }}
              disabled={isDownloading}
              className="p-1.5 rounded-md bg-gray-800 hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isDownloading ? (
                <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
              ) : (
                <Download className="w-4 h-4 text-gray-400 hover:text-white" />
              )}
            </button>
          </Tooltip>
        )}
        
        {/* 즐겨찾기 버튼 - clip 타입에서만 */}
        {onFavoriteToggle && type === 'clip' && (
          <Tooltip text={isFavorite ? "Remove from Favorites" : "Add to Favorites"} position="top">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onFavoriteToggle();
              }}
              className="p-1.5 rounded-md bg-gray-800 hover:bg-gray-700 transition-colors"
            >
              <Star className={`w-4 h-4 ${
                isFavorite
                  ? "fill-current"
                  : "text-gray-400 hover:text-white"
              }`} style={{
                color: isFavorite ? (theme?.primaryColor || '#fbbf24') : undefined
              }} />
            </button>
          </Tooltip>
        )}
      </div>
    </div>
  );
});

LibraryCardActions.displayName = 'LibraryCardActions';