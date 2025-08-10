'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { TextClip as TextClipType } from '@/types/video-editor';

interface TextOverlayEditorProps {
  textClips: TextClipType[];
  containerWidth: number;
  containerHeight: number;
  currentTime: number;
  pixelsPerSecond: number;
  onUpdatePosition: (id: string, x: number, y: number) => void;
  onUpdateSize: (id: string, fontSize: number) => void;
  selectedClip: string | null;
  onSelectClip: (id: string | null) => void;
}

// Canvas를 사용한 정확한 텍스트 크기 측정
const measureTextSize = (text: string, fontSize: number, fontFamily: string = 'sans-serif', fontWeight: string = 'bold') => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return { width: fontSize * text.length * 0.6, height: fontSize * 1.2 };
  
  ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
  const metrics = ctx.measureText(text);
  
  // 실제 텍스트 너비 + 패딩 고려
  const padding = 24; // 좌우 패딩 12px씩
  return {
    width: metrics.width + padding,
    height: fontSize * 1.5 + 16 // 상하 패딩 8px씩
  };
};

export default function TextOverlayEditor({
  textClips,
  containerWidth,
  containerHeight,
  currentTime,
  pixelsPerSecond,
  onUpdatePosition,
  onUpdateSize,
  selectedClip,
  onSelectClip
}: TextOverlayEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [draggedClip, setDraggedClip] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [showGuides, setShowGuides] = useState(false);
  const [resizingClip, setResizingClip] = useState<string | null>(null);
  const [resizeStart, setResizeStart] = useState({ y: 0, size: 0 });
  const [actualContainerSize, setActualContainerSize] = useState({ width: 0, height: 0 });

  // 컨테이너 크기 업데이트
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setActualContainerSize({ width: rect.width, height: rect.height });
      }
    };
    
    // 초기 업데이트 및 변경 감지
    updateSize();
    
    // ResizeObserver로 컨테이너 크기 변경 감지
    const resizeObserver = new ResizeObserver(updateSize);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }
    
    window.addEventListener('resize', updateSize);
    
    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', updateSize);
    };
  }, []);

  // 현재 시간에 활성화된 텍스트 클립만 필터링
  const getActiveTextClips = () => {
    const currentFrame = currentTime * 30; // 30fps
    return textClips.filter(clip => {
      const startFrame = (clip.position / pixelsPerSecond) * 30;
      const endFrame = ((clip.position + clip.duration) / pixelsPerSecond) * 30;
      return currentFrame >= startFrame && currentFrame < endFrame;
    });
  };

  const activeClips = getActiveTextClips();

  // 컨테이너 크기 가져오기 - 실제 DOM 크기 우선 사용
  const getContainerSize = useCallback(() => {
    // 실제 DOM 크기가 있으면 사용
    if (actualContainerSize.width > 0 && actualContainerSize.height > 0) {
      return actualContainerSize;
    }
    // 없으면 props로 전달받은 크기 사용 (비디오 비율)
    return { width: containerWidth || 1080, height: containerHeight || 1920 };
  }, [actualContainerSize, containerWidth, containerHeight]);

  // 퍼센트를 픽셀로 변환
  const percentToPixel = (percent: number | undefined, max: number, defaultPercent: number = 50): number => {
    const p = percent ?? defaultPercent;
    return (p / 100) * max;
  };

  // 픽셀을 퍼센트로 변환
  const pixelToPercent = (pixel: number, max: number): number => {
    return (pixel / max) * 100;
  };

  // 드래그 시작
  const handleMouseDown = (e: React.MouseEvent, clipId: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    const clip = textClips.find(c => c.id === clipId);
    if (!clip) return;

    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const size = getContainerSize();
    const x = percentToPixel(clip.style?.positionX, size.width);
    const y = percentToPixel(clip.style?.positionY, size.height);
    
    
    setDraggedClip(clipId);
    setDragOffset({
      x: e.clientX - rect.left - x,
      y: e.clientY - rect.top - y
    });
    setShowGuides(true);
    onSelectClip(clipId);
  };

  // 리사이즈 시작
  const handleResizeStart = (e: React.MouseEvent, clipId: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    const clip = textClips.find(c => c.id === clipId);
    if (!clip) return;
    
    setResizingClip(clipId);
    setResizeStart({
      y: e.clientY,
      size: clip.style?.fontSize || 24
    });
    onSelectClip(clipId);
  };

  // 마우스 이동 처리
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (draggedClip) {
        const rect = containerRef.current?.getBoundingClientRect();
        if (!rect) return;

        const clip = textClips.find(c => c.id === draggedClip);
        if (!clip) return;

        const size = getContainerSize();
        
        // 실제 텍스트 크기 측정
        const fontSize = clip.style?.fontSize || 24;
        const fontFamily = clip.style?.fontFamily || 'sans-serif';
        const fontWeight = clip.style?.fontWeight || 'bold';
        const textSize = measureTextSize(clip.content, fontSize, fontFamily, fontWeight);
        
        // 마우스 위치에서 드래그 오프셋을 뺀 중심점 계산
        const centerX = e.clientX - rect.left - dragOffset.x;
        const centerY = e.clientY - rect.top - dragOffset.y;
        
        // transform: translate(-50%, -50%)를 고려한 경계 계산
        // 텍스트의 중심이 이동하므로, 텍스트의 절반 크기만큼 여백 필요
        const halfWidth = textSize.width / 2;
        const halfHeight = textSize.height / 2;
        
        // 텍스트가 정확히 경계에 닿도록 제한
        const minX = halfWidth;
        const maxX = size.width - halfWidth;
        const minY = halfHeight;
        const maxY = size.height - halfHeight;
        
        const clampedX = Math.max(minX, Math.min(maxX, centerX));
        const clampedY = Math.max(minY, Math.min(maxY, centerY));
        
        const xPercent = pixelToPercent(clampedX, size.width);
        const yPercent = pixelToPercent(clampedY, size.height);
        
        onUpdatePosition(draggedClip, xPercent, yPercent);
      } else if (resizingClip) {
        const deltaY = e.clientY - resizeStart.y;
        const newSize = Math.max(8, Math.min(72, resizeStart.size + deltaY / 2));
        onUpdateSize(resizingClip, newSize);
      }
    };

    const handleMouseUp = () => {
      setDraggedClip(null);
      setResizingClip(null);
      setShowGuides(false);
    };

    if (draggedClip || resizingClip) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [draggedClip, resizingClip, dragOffset, resizeStart, actualContainerSize, containerWidth, containerHeight, onUpdatePosition, onUpdateSize, textClips, getContainerSize]);

  // 클릭 외부 감지
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onSelectClip(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onSelectClip]);

  if (activeClips.length === 0) return null;

  return (
    <div 
      ref={containerRef}
      className="absolute inset-0 pointer-events-none z-20"
    >
      {/* 가이드라인 */}
      {showGuides && (
        <div className="absolute inset-0">
          {/* 중앙 가이드라인 */}
          <div className="absolute left-1/2 top-0 bottom-0 w-px bg-cyan-400 opacity-50" />
          <div className="absolute top-1/2 left-0 right-0 h-px bg-cyan-400 opacity-50" />
          
          {/* 3분할 가이드라인 */}
          <div className="absolute left-1/3 top-0 bottom-0 w-px bg-cyan-400 opacity-30" />
          <div className="absolute left-2/3 top-0 bottom-0 w-px bg-cyan-400 opacity-30" />
          <div className="absolute top-1/3 left-0 right-0 h-px bg-cyan-400 opacity-30" />
          <div className="absolute top-2/3 left-0 right-0 h-px bg-cyan-400 opacity-30" />
        </div>
      )}

      {/* 텍스트 클립들 */}
      {activeClips.map(clip => {
        const isSelected = selectedClip === clip.id;
        const size = getContainerSize();
        const x = percentToPixel(clip.style?.positionX, size.width);
        const y = percentToPixel(clip.style?.positionY, size.height);

        return (
          <div
            key={clip.id}
            className={`absolute pointer-events-auto ${
              isSelected ? 'ring-2 ring-[#38f47cf9] ring-offset-2 ring-offset-transparent' : ''
            }`}
            style={{
              left: `${x}px`,
              top: `${y}px`,
              transform: 'translate(-50%, -50%)',
              cursor: draggedClip === clip.id ? 'grabbing' : 'grab',
              transition: draggedClip === clip.id ? 'none' : 'all 0.1s',
            }}
          >
            {/* 텍스트 콘텐츠 */}
            <div
              onMouseDown={(e) => handleMouseDown(e, clip.id)}
              onClick={(e) => {
                e.stopPropagation();
                onSelectClip(clip.id);
              }}
              style={{
                fontSize: `${clip.style?.fontSize || 24}px`,
                color: clip.style?.color || '#FFFFFF',
                fontFamily: clip.style?.fontFamily || 'sans-serif',
                fontWeight: clip.style?.fontWeight || 'bold',
                textAlign: clip.style?.alignment || 'center',
                padding: '8px 12px',
                backgroundColor: isSelected ? 'rgba(0, 0, 0, 0.3)' : 'transparent',
                borderRadius: '4px',
                userSelect: 'none',
                whiteSpace: 'nowrap',
              }}
            >
              {clip.content}
            </div>

            {/* 리사이즈 핸들 (선택된 경우만) */}
            {isSelected && (
              <>
                {/* 크기 조절 핸들 - 우하단 */}
                <div
                  className="absolute bottom-0 right-0 w-4 h-4 bg-[#38f47cf9] rounded-full cursor-se-resize pointer-events-auto"
                  style={{ transform: 'translate(50%, 50%)' }}
                  onMouseDown={(e) => handleResizeStart(e, clip.id)}
                />

                {/* 위치 정보 표시 */}
                <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-black/80 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                  X: {Math.round(clip.style?.positionX || 50)}% | Y: {Math.round(clip.style?.positionY || 50)}% | Size: {clip.style?.fontSize || 24}px
                </div>
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}