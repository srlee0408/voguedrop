/**
 * TimelineSelectionBox - 타임라인 선택 박스 컴포넌트 🎯
 * 
 * 📌 주요 역할:
 * 1. 타임라인에서 범위 선택 시 표시되는 시각적 오버레이
 * 2. 선택된 영역의 경계를 빨간색 테두리로 명확히 표시
 * 3. 활성화 상태에서 4방향 리사이즈 핸들 제공
 * 4. 드래그를 통한 선택 영역 이동 지원
 * 
 * 🎯 핵심 특징:
 * - 활성/비활성 상태에 따른 다른 투명도 및 상호작용
 * - 좌우상하 리사이즈 핸들로 선택 영역 크기 조절 가능
 * - z-index 관리로 다른 요소들 위에 올바르게 표시
 * - 픽셀 단위 정밀한 위치 및 크기 제어
 * 
 * 🚧 주의사항:
 * - 활성 상태에서만 리사이즈 핸들과 드래그 기능 활성화
 * - 좌표와 크기는 픽셀 단위로 정확히 전달되어야 함
 * - 상위 컴포넌트에서 선택 범위 상태 관리 필요
 */
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