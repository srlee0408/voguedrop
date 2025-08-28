/**
 * 통합 Generation Progress 계산 유틸리티
 * VideoGeneration, ImageBrush, SoundLibrary에서 사용하는 공통 로직 통합
 */

export interface ProgressCheckpoint {
  time: number;
  progress: number;
}

export interface ProgressConfig {
  mode?: 'fast' | 'normal' | 'slow';
  expectedDuration?: number;
  checkpoints?: ProgressCheckpoint[];
  updateInterval?: number;
  maxAutoProgress?: number;
}

export interface ProgressState {
  current: number;
  target: number;
  startTime: number;
  isCompleting: boolean;
}

// 기본 체크포인트 세트
const DEFAULT_CHECKPOINTS = {
  fast: [
    // FLUX, 빠른 이미지 처리용 (80초)
    { time: 5, progress: 8 },
    { time: 10, progress: 20 },
    { time: 20, progress: 35 },
    { time: 30, progress: 50 },
    { time: 40, progress: 65 },
    { time: 50, progress: 75 },
    { time: 60, progress: 83 },
    { time: 70, progress: 88 },
    { time: 80, progress: 90 },
  ],
  normal: [
    // 일반 비디오 생성용 (190초)
    { time: 10, progress: 5 },
    { time: 30, progress: 15 },
    { time: 60, progress: 30 },
    { time: 100, progress: 50 },
    { time: 140, progress: 70 },
    { time: 170, progress: 83 },
    { time: 190, progress: 90 },
  ],
  slow: [
    // I2I, 느린 이미지 처리용 (180초)
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
  ]
};

/**
 * Progress 계산기 클래스
 */
export class ProgressCalculator {
  private config: Required<ProgressConfig>;
  private state: ProgressState;
  private animationFrame: number | null = null;
  private onUpdate?: (progress: number) => void;

  constructor(config: ProgressConfig = {}, onUpdate?: (progress: number) => void) {
    this.config = {
      mode: config.mode || 'normal',
      expectedDuration: config.expectedDuration || this.getDefaultDuration(config.mode || 'normal'),
      checkpoints: config.checkpoints || DEFAULT_CHECKPOINTS[config.mode || 'normal'],
      updateInterval: config.updateInterval || 1000,
      maxAutoProgress: config.maxAutoProgress || 90
    };

    this.state = {
      current: 1, // 즉시 1%에서 시작 (사용자 피드백)
      target: 1,
      startTime: Date.now(),
      isCompleting: false
    };

    this.onUpdate = onUpdate;
  }

  private getDefaultDuration(mode: 'fast' | 'normal' | 'slow'): number {
    switch (mode) {
      case 'fast': return 80;
      case 'slow': return 180;
      default: return 190;
    }
  }

  /**
   * Progress 계산 시작 (즉시 1%로 시작)
   */
  start(): void {
    this.state.current = 1;
    this.state.target = 5;
    this.state.startTime = Date.now();
    this.onUpdate?.(1);
    this.animate();
  }

  /**
   * 경과 시간 기반 목표 진행률 계산
   */
  calculateTargetProgress(elapsedSeconds: number = this.getElapsedSeconds()): number {
    const checkpoints = this.config.checkpoints;
    let targetProgress = 1; // 최소 1%

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
        targetProgress = Math.max(1, (elapsedSeconds / checkpoint.time) * checkpoint.progress);
        break;
      }
    }

    // 예상 시간 초과 시 로그 함수로 감속
    if (elapsedSeconds > this.config.expectedDuration) {
      const overtime = elapsedSeconds - this.config.expectedDuration;
      const slowdown = Math.log(1 + overtime / this.config.expectedDuration) * 2;
      targetProgress = Math.max(85, this.config.maxAutoProgress - slowdown);
    }

    // 약간의 랜덤 변동으로 자연스러움 증가 (선택적)
    const smoothIncrement = Math.random() * 0.3;
    targetProgress += smoothIncrement;
    
    return Math.min(targetProgress, this.config.maxAutoProgress);
  }

  /**
   * 목표 진행률 업데이트 (외부에서 실제 상태 받았을 때)
   */
  setTarget(progress: number): void {
    if (this.state.isCompleting) return;
    
    // 역행 방지
    this.state.target = Math.max(this.state.current, Math.min(progress, this.config.maxAutoProgress));
  }

  /**
   * 자동 업데이트 (시간 기반)
   */
  autoUpdate(): void {
    if (this.state.isCompleting) return;
    
    const targetProgress = this.calculateTargetProgress();
    this.setTarget(targetProgress);
  }

  /**
   * 완료 애니메이션 (90% → 100%)
   */
  complete(onComplete?: () => void): void {
    if (this.state.isCompleting) return;
    
    this.state.isCompleting = true;
    this.state.target = 100;
    
    // 완료 애니메이션 시간 계산
    const remainingProgress = 100 - this.state.current;
    const animationDuration = Math.min(2000, Math.max(500, remainingProgress * 30));
    
    setTimeout(() => {
      this.destroy();
      onComplete?.();
    }, animationDuration);
  }

  /**
   * 부드러운 애니메이션 (requestAnimationFrame 사용)
   */
  private animate = (): void => {
    if (this.state.current < this.state.target) {
      // easeOut 함수 적용
      const diff = this.state.target - this.state.current;
      this.state.current += diff * 0.1; // 부드럽게 증가
      
      const flooredProgress = Math.floor(this.state.current);
      this.onUpdate?.(flooredProgress);
    }
    
    if (!this.state.isCompleting) {
      this.animationFrame = requestAnimationFrame(this.animate);
    }
  };

  /**
   * 현재 진행률 가져오기
   */
  getCurrentProgress(): number {
    return Math.floor(this.state.current);
  }

  /**
   * 경과 시간 (초) 가져오기
   */
  private getElapsedSeconds(): number {
    return (Date.now() - this.state.startTime) / 1000;
  }

  /**
   * 리소스 정리
   */
  destroy(): void {
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }
  }
}

/**
 * Legacy 호환성을 위한 함수형 인터페이스들
 */

// ImageBrush 호환
export const calculateProgressForElapsedTime = (
  elapsedSeconds: number, 
  mode: 'flux' | 'i2i'
): number => {
  const progressMode = mode === 'flux' ? 'fast' : 'slow';
  const calculator = new ProgressCalculator({ mode: progressMode });
  return calculator.calculateTargetProgress(elapsedSeconds);
};

// VideoGeneration 호환  
export const calculateVideoProgress = (
  elapsedSeconds: number, 
  expectedDuration: number = 190
): number => {
  const calculator = new ProgressCalculator({ 
    mode: 'normal',
    expectedDuration 
  });
  return calculator.calculateTargetProgress(elapsedSeconds);
};

// SoundLibrary 호환
export const calculateSoundProgress = (
  elapsedSeconds: number, 
  expectedDuration: number = 15
): number => {
  const calculator = new ProgressCalculator({ 
    mode: 'fast',
    expectedDuration 
  });
  return calculator.calculateTargetProgress(elapsedSeconds);
};

/**
 * 완료 애니메이션 시간 계산
 */
export const calculateCompletionAnimationDuration = (currentProgress: number): number => {
  const remainingProgress = 100 - currentProgress;
  return Math.min(2000, Math.max(500, remainingProgress * 30));
};

/**
 * easing 함수
 */
export const easeOutCubic = (t: number): number => {
  return 1 - Math.pow(1 - t, 3);
};

/**
 * 완료 애니메이션 실행 헬퍼
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

// 상수들
export const PROGRESS_UPDATE_INTERVAL = 1000; // 1초마다 업데이트
export const DEFAULT_MAX_AUTO_PROGRESS = 90; // 자동 증가 상한선

/**
 * Tailwind 클래스 병합 유틸리티 (shadcn 호환)
 */
export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ');
}

/**
 * UUID를 8자리 짧은 ID로 변환
 */
export function getShortId(uuid: string): string {
  if (!uuid) return '';
  // 제거 후 앞 8자리 사용
  const compact = uuid.replace(/-/g, '');
  return compact.slice(0, 8);
}