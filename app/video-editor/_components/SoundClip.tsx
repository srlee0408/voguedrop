'use client';

import { useRef } from 'react';
import { SoundClip as SoundClipType } from '@/types/video-editor';

interface SoundClipProps {
  clip: SoundClipType;
  onEdit?: (clip: SoundClipType) => void;
  onDelete?: (id: string) => void;
  onResize?: (id: string, newDuration: number) => void;
  onResizeStart?: (e: React.MouseEvent, handle: 'left' | 'right') => void;
  isActive?: boolean;
  pixelsPerSecond?: number;
}

export default function SoundClip({
  clip,
  onEdit,
  onResizeStart,
  isActive = false,
  pixelsPerSecond = 40,
}: SoundClipProps) {
  const clipRef = useRef<HTMLDivElement>(null);

  const handleDoubleClick = () => {
    if (onEdit) {
      onEdit(clip);
    }
  };

  const formatDuration = (duration: number) => {
    // Convert pixels to seconds using pixelsPerSecond
    const totalSeconds = Math.floor(duration / pixelsPerSecond);
    const minutes = Math.floor(totalSeconds / 60);
    const remainingSeconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <div
      ref={clipRef}
      className={`group relative w-full h-full ${isActive ? 'z-10' : ''}`}
      onDoubleClick={handleDoubleClick}
    >
      <div className={`w-full h-8 bg-green-900/50 backdrop-blur-sm rounded cursor-move hover:bg-green-900/60 transition-colors ${
        isActive ? 'ring-2 ring-[#38f47cf9]' : ''
      }`}>
        <div className="absolute inset-0 flex items-center px-2 overflow-hidden">
          <div className="flex items-center gap-2 w-full">
            <i className="ri-volume-up-line text-xs text-green-300 flex-shrink-0"></i>
            <span className="text-xs text-white truncate flex-1">
              {clip.name}
            </span>
            <span className="text-[10px] text-gray-400 whitespace-nowrap">
              {formatDuration(clip.duration)}
            </span>
          </div>
          
          {/* Volume indicator */}
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/20">
            <div 
              className="h-full bg-green-400/50"
              style={{ width: `${clip.volume}%` }}
            />
          </div>
        </div>
        
        {/* Resize handles - 항상 보이도록 변경 */}
        <div
          className="absolute inset-y-0 left-0 w-1 bg-green-500 rounded-l cursor-ew-resize resize-handle"
          onMouseDown={(e) => onResizeStart?.(e, 'left')}
        />
        <div
          className="absolute inset-y-0 right-0 w-1 bg-green-500 rounded-r cursor-ew-resize resize-handle"
          onMouseDown={(e) => onResizeStart?.(e, 'right')}
        />
      </div>
    </div>
  );
}