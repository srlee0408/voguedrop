'use client';

import { useState, useRef } from 'react';
import { TextClip as TextClipType } from '@/types/video-editor';

interface TextClipProps {
  clip: TextClipType;
  onEdit?: (clip: TextClipType) => void;
  onDelete?: (id: string) => void;
  onResize?: (id: string, newDuration: number) => void;
  isActive?: boolean;
}

export default function TextClip({
  clip,
  onEdit,
  onDelete,
  onResize,
  isActive = false,
}: TextClipProps) {
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

  const getEffectClass = () => {
    switch (clip.effect) {
      case 'pulse': return 'animate-pulse';
      case 'bounce': return 'animate-bounce';
      case 'spin': return 'animate-spin';
      default: return '';
    }
  };

  const getEffectStyle = () => {
    if (clip.effect === 'gradient') {
      return {
        background: 'linear-gradient(45deg, #38f47c, #3b82f6)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
      };
    }
    if (clip.effect === 'glow') {
      return {
        textShadow: '0 0 10px rgba(56, 244, 124, 0.8)',
      };
    }
    return {};
  };

  return (
    <div
      ref={clipRef}
      className={`group relative ${isActive ? 'z-10' : ''}`}
      style={{ width: `${clip.duration}px` }}
      onDoubleClick={handleDoubleClick}
    >
      <div className={`w-full h-8 bg-purple-900/50 backdrop-blur-sm rounded cursor-move hover:bg-purple-900/60 transition-colors ${
        isActive ? 'ring-2 ring-[#38f47cf9]' : ''
      }`}>
        <div className="absolute inset-0 flex items-center px-2 overflow-hidden">
          <div className="flex items-center gap-2 w-full">
            <i className="ri-text text-xs text-purple-300 flex-shrink-0"></i>
            <span 
              className={`text-xs text-white truncate ${getEffectClass()}`}
              style={{
                ...getEffectStyle(),
                color: clip.effect === 'gradient' ? undefined : clip.style.color,
              }}
            >
              {clip.content}
            </span>
          </div>
          {onEdit && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit(clip);
              }}
              className="absolute right-1 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center text-gray-400 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <i className="ri-edit-line text-xs"></i>
            </button>
          )}
        </div>
        
        {/* Resize handles */}
        <div
          className="absolute inset-y-0 left-0 w-1 bg-purple-500 rounded-l cursor-ew-resize opacity-0 group-hover:opacity-100 transition-opacity"
          onMouseDown={(e) => handleResizeStart(e, 'left')}
        />
        <div
          className="absolute inset-y-0 right-0 w-1 bg-purple-500 rounded-r cursor-ew-resize opacity-0 group-hover:opacity-100 transition-opacity"
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
      </div>
    </div>
  );
}