'use client';

import { useState, useRef } from 'react';
import { SoundClip as SoundClipType } from '@/types/video-editor';

interface SoundClipProps {
  clip: SoundClipType;
  onEdit?: (clip: SoundClipType) => void;
  onDelete?: (id: string) => void;
  onResize?: (id: string, newDuration: number) => void;
  isActive?: boolean;
}

export default function SoundClip({
  clip,
  onEdit,
  onDelete,
  onResize,
  isActive = false,
}: SoundClipProps) {
  const [, setIsResizing] = useState(false);
  const [startX, setStartX] = useState(0);
  const [startWidth, setStartWidth] = useState(clip.duration);
  const clipRef = useRef<HTMLDivElement>(null);

  const handleResizeStart = (e: React.MouseEvent, side: 'left' | 'right') => {
    e.stopPropagation();
    setIsResizing(true);
    setStartX(e.clientX);
    setStartWidth(clip.duration);
    
    const handleMouseMove = (e: MouseEvent) => {
      const delta = e.clientX - startX;
      const newWidth = side === 'right' 
        ? Math.max(80, startWidth + delta)
        : Math.max(80, startWidth - delta);
      
      if (clipRef.current) {
        clipRef.current.style.width = `${newWidth}px`;
      }
    };

    const handleMouseUp = (e: MouseEvent) => {
      const delta = e.clientX - startX;
      const newWidth = side === 'right'
        ? Math.max(80, startWidth + delta)
        : Math.max(80, startWidth - delta);
      
      if (onResize) {
        onResize(clip.id, newWidth);
      }
      
      setIsResizing(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleDoubleClick = () => {
    if (onEdit) {
      onEdit(clip);
    }
  };

  const formatDuration = (duration: number) => {
    const seconds = Math.floor(duration / 10);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <div
      ref={clipRef}
      className={`group relative ${isActive ? 'z-10' : ''}`}
      style={{ width: `${clip.duration}px` }}
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
        
        {/* Resize handles */}
        <div
          className="absolute inset-y-0 left-0 w-1 bg-green-500 rounded-l cursor-ew-resize opacity-0 group-hover:opacity-100 transition-opacity"
          onMouseDown={(e) => handleResizeStart(e, 'left')}
        />
        <div
          className="absolute inset-y-0 right-0 w-1 bg-green-500 rounded-r cursor-ew-resize opacity-0 group-hover:opacity-100 transition-opacity"
          onMouseDown={(e) => handleResizeStart(e, 'right')}
        />
        
        {/* Delete button */}
        {onDelete && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(clip.id);
            }}
            className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
          >
            <i className="ri-close-line text-xs text-white"></i>
          </button>
        )}
        
        {/* Edit button */}
        {onEdit && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit(clip);
            }}
            className="absolute top-1 right-1 w-5 h-5 flex items-center justify-center text-gray-400 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <i className="ri-settings-3-line text-xs"></i>
          </button>
        )}
      </div>
    </div>
  );
}