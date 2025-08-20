'use client';

interface SelectionBoxProps {
  left: number;
  top: number;
  width: number;
  height: number;
  isActive?: boolean;
  onMouseDown?: (e: React.MouseEvent<HTMLDivElement>) => void;
  onResizeStart?: (e: React.MouseEvent<HTMLDivElement>, handle: 'left' | 'right' | 'top' | 'bottom') => void;
}

/**
 * Timeline selection box component
 * Displays range selection overlay with resize handles
 */
export default function TimelineSelectionBox({
  left,
  top,
  width,
  height,
  isActive = false,
  onMouseDown,
  onResizeStart,
}: SelectionBoxProps) {
  const baseClassName = isActive 
    ? "absolute bg-red-500/10 border border-red-400"
    : "absolute bg-red-500/20 border border-red-400/60 pointer-events-none";

  return (
    <div
      className={baseClassName}
      style={{ 
        left: `${left}px`, 
        top: `${top}px`, 
        width: `${width}px`, 
        height: `${height}px`, 
        zIndex: isActive ? 41 : 40 
      }}
      onMouseDown={onMouseDown}
    >
      {isActive && onResizeStart && (
        <>
          {/* Left resize handle */}
          <div
            className="absolute inset-y-0 left-0 w-1 bg-red-400 cursor-ew-resize"
            onMouseDown={(e) => onResizeStart(e, 'left')}
          />
          {/* Right resize handle */}
          <div
            className="absolute inset-y-0 right-0 w-1 bg-red-400 cursor-ew-resize"
            onMouseDown={(e) => onResizeStart(e, 'right')}
          />
          {/* Top resize handle */}
          <div
            className="absolute inset-x-0 top-0 h-1 bg-red-400 cursor-ns-resize"
            onMouseDown={(e) => onResizeStart(e, 'top')}
          />
          {/* Bottom resize handle */}
          <div
            className="absolute inset-x-0 bottom-0 h-1 bg-red-400 cursor-ns-resize"
            onMouseDown={(e) => onResizeStart(e, 'bottom')}
          />
        </>
      )}
    </div>
  );
}