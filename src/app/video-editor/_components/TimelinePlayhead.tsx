/**
 * TimelinePlayhead - 타임라인 재생헤드 컴포넌트
 * 
 * 📌 주요 역할:
 * 1. 현재 재생 위치를 시각적으로 표시하는 빨간 세로선
 * 2. 사용자가 드래그하여 재생 위치를 변경할 수 있는 인터랙티브 요소
 * 3. 픽셀 위치를 받아 정확한 타임라인 상의 위치에 표시
 * 
 * 🎯 핵심 특징:
 * - 드래그 가능한 빨간 세로선으로 시각적 구현
 * - 높이는 타임라인 전체 높이에 맞게 자동 조절
 * - 마우스 다운 이벤트를 상위 컴포넌트로 전달하여 드래그 로직 처리
 * - z-index 최상위로 다른 요소들 위에 표시
 * 
 * 💡 주의사항:
 * - position은 픽셀 단위로 전달되어야 함
 * - 드래그 로직은 상위 컴포넌트에서 처리
 * - 시각적 표시만 담당하는 Presentational 컴포넌트
 */
'use client';

import { useRef } from 'react';

/**
 * TimelinePlayhead Props 인터페이스
 */
interface TimelinePlayheadProps {
  /** 📍 재생헤드 위치 (픽셀 단위) */
  position: number;
  /** 📏 재생헤드 높이 (CSS 값, 기본: 100%) */
  height?: string;
  /** 🖱️ 마우스 다운 이벤트 핸들러 (드래그 시작) */
  onMouseDown: (e: React.MouseEvent) => void;
}
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