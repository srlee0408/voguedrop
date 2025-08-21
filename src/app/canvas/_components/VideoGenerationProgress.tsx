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