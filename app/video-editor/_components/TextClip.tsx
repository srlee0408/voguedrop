'use client';

import { useRef } from 'react';
import { TextClip as TextClipType } from '@/types/video-editor';

interface TextClipProps {
  clip: TextClipType;
  onEdit?: (clip: TextClipType) => void;
  onDelete?: (id: string) => void;
  onResizeStart?: (e: React.MouseEvent, handle: 'left' | 'right') => void;
  isActive?: boolean;
}

export default function TextClip({
  clip,
  onEdit,
  onResizeStart,
  isActive = false,
}: TextClipProps) {
  const clipRef = useRef<HTMLDivElement>(null);

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
      className={`group relative w-full h-full ${isActive ? 'z-10' : ''}`}
      onDoubleClick={handleDoubleClick}
    >
      <div className={`w-full h-5 bg-purple-900/50 backdrop-blur-sm rounded cursor-move hover:bg-purple-900/60 transition-colors ${
        isActive ? 'ring-2 ring-[#38f47cf9]' : ''
      }`}>
        <div className="absolute inset-0 flex items-center px-1 overflow-hidden">
          <div className="flex items-center gap-1 w-full">
            <i className="ri-text text-[10px] text-purple-300 flex-shrink-0"></i>
            <span 
              className={`text-[10px] text-white truncate ${getEffectClass()}`}
              style={{
                ...getEffectStyle(),
                color: clip.effect === 'gradient' ? undefined : clip.style.color,
              }}
            >
              {clip.content}
            </span>
          </div>
        </div>
        
        {/* Resize handles - 항상 보이도록 변경 */}
        <div
          className="absolute inset-y-0 left-0 w-1 bg-purple-500 rounded-l cursor-ew-resize resize-handle"
          onMouseDown={(e) => onResizeStart?.(e, 'left')}
        />
        <div
          className="absolute inset-y-0 right-0 w-1 bg-purple-500 rounded-r cursor-ew-resize resize-handle"
          onMouseDown={(e) => onResizeStart?.(e, 'right')}
        />
      </div>
    </div>
  );
}