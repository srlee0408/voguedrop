/**
 * Image Brush 진행률 관리 유틸리티
 * VideoGeneration의 하이브리드 방식을 적용한 시간 기반 진행률 계산
 */

/**
 * 경과 시간에 따른 진행률 계산 (0~90%)
 * 체크포인트 기반으로 자연스러운 진행률 증가
 */
export const calculateProgressForElapsedTime = (
  elapsedSeconds: number, 
  mode: 'flux' | 'i2i'
): number => {
  // I2I 모드는 RunPod 처리를 고려한 더 긴 체크포인트
  const checkpoints = mode === 'i2i' ? [
    { time: 5, progress: 3 },
    { time: 15, progress: 10 },
    { time: 30, progress: 20 },
    { time: 50, progress: 35 },
    { time: 70, progress: 50 },
    { time: 90, progress: 65 },
    { time: 110, progress: 75 },
    { time: 130, progress: 83 },
    { time: 150, progress: 88 },
    { time: 180, progress: 90 },
  ] : [ 
    // FLUX 모드는 BFL API의 빠른 처리를 반영
    { time: 5, progress: 8 },
    { time: 10, progress: 20 },
    { time: 20, progress: 35 },
    { time: 30, progress: 50 },
    { time: 40, progress: 65 },
    { time: 50, progress: 75 },
    { time: 60, progress: 83 },
    { time: 70, progress: 88 },
    { time: 80, progress: 90 },
  ];

  let targetProgress = 0;

  // 체크포인트 사이 선형 보간
  for (let i = 0; i < checkpoints.length; i++) {
    const checkpoint = checkpoints[i];
    const nextCheckpoint = checkpoints[i + 1];
    
    if (elapsedSeconds >= checkpoint.time) {
      if (!nextCheckpoint || elapsedSeconds < nextCheckpoint.time) {
        if (nextCheckpoint) {
          // 두 체크포인트 사이의 진행률을 선형 보간
          const timeRatio = (elapsedSeconds - checkpoint.time) / (nextCheckpoint.time - checkpoint.time);
          const progressDiff = nextCheckpoint.progress - checkpoint.progress;
          targetProgress = checkpoint.progress + progressDiff * timeRatio;
        } else {
          // 마지막 체크포인트 이후
          targetProgress = checkpoint.progress;
        }
        break;
      }
    } else if (i === 0) {
      // 첫 체크포인트 이전
      targetProgress = (elapsedSeconds / checkpoint.time) * checkpoint.progress;
      break;
    }
  }

  // 예상 시간 초과 시 로그 함수로 감속
  const expectedDuration = mode === 'i2i' ? 180 : 80;
  if (elapsedSeconds > expectedDuration) {
    const overtime = elapsedSeconds - expectedDuration;
    const slowdown = Math.log(1 + overtime / expectedDuration) * 2;
    targetProgress = Math.max(85, 90 - slowdown);
  }

  // 약간의 랜덤 변동으로 자연스러움 증가
  const smoothIncrement = 0.1 + Math.random() * 0.2;
  targetProgress += smoothIncrement;
  
  return Math.min(targetProgress, 90);
};

/**
 * 완료 애니메이션 시간 계산
 * 남은 진행률에 비례하여 애니메이션 시간 결정
 */
export const calculateCompletionAnimationDuration = (currentProgress: number): number => {
  const remainingProgress = 100 - currentProgress;
  // 최소 500ms, 최대 2000ms, 남은 진행률 * 30ms
  return Math.min(2000, Math.max(500, remainingProgress * 30));
};

/**
 * 진행률 애니메이션을 위한 easing 함수
 * ease-out cubic 적용
 */
export const easeOutCubic = (t: number): number => {
  return 1 - Math.pow(1 - t, 3);
};

/**
 * 진행률 업데이트 간격 (ms)
 */
export const PROGRESS_UPDATE_INTERVAL = 1000; // 1초마다 업데이트

/**
 * 폴링 간격과 동기화된 진행률 관리
 */
export interface ProgressState {
  current: number;
  target: number;
  startTime: number;
  isCompleting: boolean;
}

/**
 * 진행률 상태 초기화
 */
export const initProgressState = (): ProgressState => ({
  current: 0,
  target: 0,
  startTime: Date.now(),
  isCompleting: false,
});

/**
 * 완료 애니메이션 실행을 위한 헬퍼
 */
export const animateToComplete = (
  currentProgress: number,
  onUpdate: (progress: number) => void,
  onComplete?: () => void
): void => {
  const animationDuration = calculateCompletionAnimationDuration(currentProgress);
  const startTime = Date.now();
  
  const animate = () => {
    const elapsed = Date.now() - startTime;
    const ratio = Math.min(elapsed / animationDuration, 1);
    const easedRatio = easeOutCubic(ratio);
    
    const progress = Math.floor(currentProgress + (100 - currentProgress) * easedRatio);
    onUpdate(progress);
    
    if (ratio < 1) {
      requestAnimationFrame(animate);
    } else {
      onComplete?.();
    }
  };
  
  animate();
};