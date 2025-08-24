'use client';

interface TimelineGridProps {
  /** 타임라인 총 길이 (초) */
  timelineLengthInSeconds: number;
  /** 1초당 픽셀 수 (예: 40px = 1초) */
  pixelsPerSecond: number;
  /** 그리드 높이 */
  height: string | number;
  /** 그리드 간격 (초 단위, 기본값: 1초) */
  interval?: number;
}

/**
 * 타임라인 백그라운드 그리드 컴포넌트
 * 
 * 초 단위로 세로 점선을 그려서 시간 구간을 시각적으로 구분합니다.
 * 클립 배치와 시간 파악을 용이하게 하는 가이드라인 역할을 합니다.
 * 
 * @param timelineLengthInSeconds - 타임라인 총 길이 (초)
 * @param pixelsPerSecond - 1초당 픽셀 수 (40px = 1초)
 * @param height - 그리드 높이
 * @param interval - 그리드 간격 (초 단위, 기본값: 1초)
 */
export default function TimelineGrid({
  timelineLengthInSeconds,
  pixelsPerSecond,
  height,
  interval = 1
}: TimelineGridProps) {
  // 그리드 라인을 그릴 위치들 계산 (초 단위)
  const gridPositions: number[] = [];
  for (let i = interval; i <= timelineLengthInSeconds; i += interval) {
    gridPositions.push(i);
  }

  return (
    <div 
      className="absolute inset-0 pointer-events-none"
      style={{ height }}
    >
      {gridPositions.map((second) => (
        <div
          key={second}
          className="absolute top-0 bottom-0 border-l border-dashed border-gray-600/30"
          style={{
            left: `${second * pixelsPerSecond}px`,
            width: '1px'
          }}
        />
      ))}
    </div>
  );
}