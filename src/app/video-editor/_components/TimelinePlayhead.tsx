'use client';

import { useRef } from 'react';

interface TimelinePlayheadProps {
  position: number; // in pixels
  height?: string;
  onMouseDown: (e: React.MouseEvent) => void;
}

/**
 * Timeline playhead component
 * Displays the current playback position indicator
 */
export default function TimelinePlayhead({ 
  position, 
  height = '100%',
  onMouseDown 
}: TimelinePlayheadProps) {
  const playheadRef = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={playheadRef}
      className="absolute"
      style={{
        top: '0',
        bottom: '0',
        left: `${position - 6.5}px`, // Center the 13px wide container on the position
        zIndex: 40,
        width: '13px', // Draggable area width
        cursor: 'ew-resize',
        height,
      }}
      onMouseDown={onMouseDown}
    >
      {/* Actual red line */}
      <div 
        className="absolute top-0 bottom-0 w-0.5 bg-red-500"
        style={{
          left: '50%',
          transform: 'translateX(-50%)',
          boxShadow: '0 0 6px rgba(239, 68, 68, 0.8)',
          pointerEvents: 'none'
        }}
      />
      {/* Playhead top triangle marker */}
      <div className="absolute -top-2 left-1/2 transform -translate-x-1/2">
        <div className="w-0 h-0 border-l-[7px] border-l-transparent border-r-[7px] border-r-transparent border-t-[10px] border-t-red-500"></div>
      </div>
    </div>
  );
}