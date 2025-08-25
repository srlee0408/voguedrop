'use client';

import { VideoClip as VideoClipType } from '@/shared/types/video-editor';

interface VideoClipProps {
  clip: VideoClipType;
  onResizeStart?: (e: React.MouseEvent, handle: 'left' | 'right') => void;
  isActive?: boolean;
  isSelected?: boolean;
  isRectSelected?: boolean;
  clipWidth?: number;
  pixelsPerSecond?: number;
}

/**
 * 비디오 클립 컴포넌트
 * 타임라인에서 비디오 클립을 렌더링하고 리사이즈 핸들을 제공합니다.
 */
export default function VideoClip({
  clip,
  onResizeStart,
  isActive = false,
  isSelected = false,
  isRectSelected = false,
  clipWidth = 200,
  pixelsPerSecond = 40,
}: VideoClipProps) {
  
  // 줌 비율 계산 (기준: 40px/초)
  const zoomRatio = pixelsPerSecond / 40;
  const actualClipWidth = clipWidth || clip.duration * zoomRatio;
  const showText = actualClipWidth > 30; // 30px 이하면 텍스트 숨김

  return (
    <div className={`group relative w-full h-full select-none ${isActive ? 'z-10' : ''}`}>
      <div 
        className={`w-full h-5 bg-gradient-to-r from-gray-900 to-gray-800 rounded cursor-pointer hover:from-gray-800 hover:to-gray-700 transition-colors relative overflow-hidden border border-gray-700 ${
          isRectSelected
            ? 'ring-2 ring-red-400'
            : isSelected
              ? 'ring-2 ring-[#38f47cf9]'
              : ''
        }`}
      >
        {/* Title - 작을 때는 숨김 */}
        {showText && (
          <div className="absolute inset-0 flex items-center">
            <div className="px-2 py-0.5 text-[10px] font-medium text-white/90 truncate">
              {clip.title || 'Video Clip'}
            </div>
          </div>
        )}
        
        {/* Resize handles - 줌 레벨에 따라 크기 조정 */}
        <div 
          className={`absolute inset-y-0 left-0 bg-[#38f47cf9] rounded-l cursor-ew-resize resize-handle ${
            actualClipWidth < 50 ? 'w-0.5' : 'w-1'
          }`}
          onMouseDown={(e) => onResizeStart?.(e, 'left')}
        />
        <div 
          className={`absolute inset-y-0 right-0 bg-[#38f47cf9] rounded-r cursor-ew-resize resize-handle ${
            actualClipWidth < 50 ? 'w-0.5' : 'w-1'
          }`}
          onMouseDown={(e) => onResizeStart?.(e, 'right')}
        />
      </div>
    </div>
  );
}
