/**
 * TimelineGrid - 타임라인 배경 그리드 컴포넌트 📊
 * 
 * 📌 주요 역할:
 * 1. 타임라인에 시간 간격을 나타내는 세로 점선 그리드 표시
 * 2. 클립 배치 시 시각적 가이드라인 제공
 * 3. 시간 구간을 직관적으로 파악할 수 있도록 도움
 * 4. 줌 레벨에 따라 그리드 간격 자동 조정
 * 
 * 🎯 핵심 특징:
 * - 1초 단위 세로 점선으로 시간 구분 표시
 * - 줌 레벨 변경 시 그리드 간격 동적 조정
 * - 타임라인 전체 높이에 맞춰 그리드 표시
 * - 성능 최적화된 CSS 기반 렌더링
 * 
 * 🚧 주의사항:
 * - 그리드는 시각적 가이드일 뿐 기능적 역할은 없음
 * - 줌 레벨이 매우 작을 때는 그리드가 밀집될 수 있음
 * - 높은 성능을 위해 CSS로 구현됨
 */
'use client';

/**
 * TimelineGrid Props 인터페이스 🎛️
 */
interface TimelineGridProps {
  /** ⏱️ 타임라인 총 길이 (초 단위) */
  timelineLengthInSeconds: number;
  /** 📏 1초당 픽셀 수 (예: 40px = 1초) */
  pixelsPerSecond: number;
  /** 📐 그리드 높이 (CSS 단위) */
  height: string | number;
  /** 📊 그리드 간격 (초 단위, 기본값: 1초) */
  interval?: number;
}

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