import { useState, useEffect, useRef, useCallback } from 'react';
import { TIMELINE_CONFIG } from '../_constants';

interface UseTimelineResizeOptions {
  defaultHeight?: number;
  minHeight?: number;
  maxHeight?: number;
}

export function useTimelineResize(options?: UseTimelineResizeOptions) {
  const {
    defaultHeight = TIMELINE_CONFIG.DEFAULT_HEIGHT,
    minHeight = TIMELINE_CONFIG.MIN_HEIGHT,
    maxHeight = TIMELINE_CONFIG.MAX_HEIGHT
  } = options || {};

  const [timelineHeight, setTimelineHeight] = useState(defaultHeight);
  const [isResizing, setIsResizing] = useState(false);
  const [dragStartY, setDragStartY] = useState(0);
  const [initialHeight, setInitialHeight] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleResizerMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    setDragStartY(e.clientY);
    setInitialHeight(timelineHeight);
  }, [timelineHeight]);

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      // 드래그 시작점 대비 상대적 변화량 계산 (위로 드래그하면 음수)
      const deltaY = dragStartY - e.clientY;
      const newHeight = initialHeight + deltaY;
      
      setTimelineHeight(Math.min(maxHeight, Math.max(minHeight, newHeight)));
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = 'ns-resize';
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
    };
  }, [isResizing, dragStartY, initialHeight, minHeight, maxHeight]);

  const getResizerCursor = () => {
    return timelineHeight >= maxHeight ? 'cursor-s-resize' : 'cursor-ns-resize';
  };

  const getResizerTitle = () => {
    return timelineHeight >= maxHeight 
      ? "드래그하여 타임라인 축소" 
      : "드래그하여 타임라인 크기 조정";
  };

  return {
    timelineHeight,
    isResizing,
    containerRef,
    handleResizerMouseDown,
    getResizerCursor,
    getResizerTitle
  };
}