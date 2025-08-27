'use client';

/**
 * TimelineRuler - 타임라인 시간 눈금 및 재생헤드 영역
 * 
 * 역할:
 * - 시간 마커(초 단위) 표시
 * - 타임라인 클릭으로 재생 위치 이동 (Seek)
 * - 3분 제한선 표시 (프리미엄 기능 유도)
 * - 줌 레벨에 따른 눈금 간격 조정
 * 
 * 특징:
 * - 픽셀 단위 정확한 시간 계산
 * - 클릭 시 3분 제한 및 전체 길이 제한 적용
 * - 시각적 제한선으로 사용자 안내
 * - 반응형 눈금 레이아웃 (줌에 따라 간격 조정)
 */

import React from 'react';
import { generateTimeMarkers } from '@/features/video-editing/_utils/common-clip-utils';

interface TimelineRulerProps {
  /** 타임라인 전체 길이 (초 단위) */
  timelineLengthInSeconds: number;
  
  /** 줌 레벨 - 1초당 픽셀 수 (기본: 40px/초) */
  pixelsPerSecond: number;
  
  /** 실제 컨텐츠 총 시간 (초) - 3분 제한 체크용 */
  totalDurationInSeconds: number;
  
  /** 시간 위치 클릭 시 재생 위치 변경 핸들러 */
  onSeek?: (time: number) => void;
  
  /** 선택/드래그 상태 - 클릭 무시용 */
  isSelectingRange: boolean;
  isAdjustingSelection: boolean;
  isMovingSelection: boolean;
  isResizing: boolean;
  isDragging: boolean;
}

/**
 * 타임라인 클릭 위치를 시간으로 변환하고 제한 적용
 * @param clickX - 클릭한 x 좌표 (상대적 위치)
 * @param pixelsPerSecond - 줌 레벨
 * @param totalDurationInSeconds - 실제 컨텐츠 길이
 * @returns 계산된 시간 (초)
 */
function calculateSeekTime(
  clickX: number, 
  pixelsPerSecond: number, 
  totalDurationInSeconds: number
): number {
  const rawTime = clickX / pixelsPerSecond;
  
  // 0초 이하는 0으로, 3분 또는 실제 길이를 넘지 않도록 제한
  const maxTime = Math.min(180, totalDurationInSeconds); // 3분 제한
  return Math.max(0, Math.min(rawTime, maxTime));
}

export function TimelineRuler({
  timelineLengthInSeconds,
  pixelsPerSecond,
  totalDurationInSeconds,
  onSeek,
  isSelectingRange,
  isAdjustingSelection,
  isMovingSelection,
  isResizing,
  isDragging,
}: TimelineRulerProps) {
  
  // 시간 마커 생성 (1초 간격)
  const timeMarkers = generateTimeMarkers(timelineLengthInSeconds);
  
  /**
   * 타임라인 클릭 핸들러 - 재생 위치 변경
   * 다양한 상호작용 상태에서는 클릭을 무시
   */
  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // 다중 선택이나 드래그 중일 때는 클릭 무시
    if (e.shiftKey || isSelectingRange || isAdjustingSelection || isMovingSelection) return;
    if (!onSeek || isResizing || isDragging) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const seekTime = calculateSeekTime(clickX, pixelsPerSecond, totalDurationInSeconds);
    
    onSeek(seekTime);
  };

  return (
    <div className="border-b border-gray-700 bg-black h-8">
      <div 
        className="flex items-center h-full relative"
        onClick={handleTimelineClick}
        style={{ cursor: onSeek ? 'pointer' : 'default' }}
      >
        {/* 시간 마커들 */}
        <div className="flex">
          {timeMarkers.map((timeText, index) => (
            <span
              key={index}
              className="text-[10px] text-gray-400 inline-flex items-center select-none"
              style={{ 
                width: `${pixelsPerSecond}px`,
                boxSizing: 'border-box',
                paddingLeft: index === 0 ? '2px' : '0',
                // 줌 레벨이 낮을 때 텍스트 겹침 방지
                fontSize: pixelsPerSecond < 30 ? '8px' : '10px'
              }}
              title={`Jump to ${timeText}`}
            >
              {timeText}
            </span>
          ))}
        </div>
        
        {/* 3분 제한 경고선 */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-20 pointer-events-none"
          style={{ 
            left: `${180 * pixelsPerSecond}px`, // 3분 = 180초
            boxShadow: '0 0 4px rgba(239, 68, 68, 0.5)'
          }}
          title="3-minute limit for free users"
        />
        
        {/* 제한선 레이블 (충분한 공간이 있을 때만 표시) */}
        {pixelsPerSecond >= 40 && (
          <div
            className="absolute top-1 text-[8px] text-red-400 bg-black/80 px-1 rounded z-21 pointer-events-none select-none"
            style={{ left: `${180 * pixelsPerSecond + 4}px` }}
          >
            3min
          </div>
        )}
      </div>
    </div>
  );
}