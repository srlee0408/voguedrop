/**
 * VideoGenerationProgress - 영상 생성 진행률 표시 컴포넌트
 * 
 * 주요 역할:
 * 1. AI 영상 생성 과정의 실시간 진행률 시각화
 * 2. 예상 완료 시간 계산 및 표시
 * 3. 생성 상태별 적절한 메시지 제공
 * 4. 프로그레스 바와 백분율 표시
 * 
 * 핵심 특징:
 * - 0%에서 100%까지의 부드러운 프로그레스 바 애니메이션
 * - 경과 시간 기반 예상 완료 시간 계산
 * - Job ID별 개별 진행률 추적
 * - 사용자 친화적인 상태 메시지 (대기 중, 처리 중, 완료)
 * 
 * 주의사항:
 * - 진행률은 실제 AI 처리 상태가 아닌 시뮬레이션 값
 * - 예상 시간은 과거 경험 데이터 기반으로 계산
 * - 네트워크 지연이나 서버 부하에 따라 실제 시간과 차이 발생 가능
 */
import { useEffect, useRef } from 'react';

interface VideoGenerationProgressProps {
  progress: number;
  isVisible: boolean;
  jobId?: string;
}

export function VideoGenerationProgress({ 
  progress, 
  isVisible,
  jobId
}: VideoGenerationProgressProps) {
  const previousProgressRef = useRef(progress);
  const startTimeRef = useRef<number>(Date.now());
  
  
  // Progress 변화 시 로깅
  useEffect(() => {
    if (isVisible && progress !== previousProgressRef.current) {
      previousProgressRef.current = progress;
    }
  }, [progress, isVisible, jobId]);
  
  // 컴포넌트 마운트 시 시작 시간 초기화
  useEffect(() => {
    if (isVisible) {
      startTimeRef.current = Date.now();
    }
  }, [isVisible]);
  
  if (!isVisible) return null;

  return (
    <div className="absolute inset-0 z-30 bg-black/60 flex items-center justify-center">
      {/* Progress bar container - thicker and more visible */}
      <div className="absolute top-0 left-0 right-0 h-2 bg-gray-800/80">
        <div 
          className="h-full bg-green-500 transition-all duration-500 ease-out relative overflow-hidden"
          style={{ width: `${progress}%` }}
        >
          {/* Animated shine effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent w-1/2 -skew-x-12 animate-shimmer" />
        </div>
      </div>
      
      {/* Progress info container - 퍼센트만 표시 */}
      <div className="text-center">
        {/* Percentage display with shadow for better visibility */}
        <div className="text-white text-7xl font-bold drop-shadow-2xl">
          {Math.round(progress)}%
        </div>
      </div>
    </div>
  );
}