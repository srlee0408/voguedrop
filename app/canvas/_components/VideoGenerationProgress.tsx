import React, { useEffect, useRef } from 'react';

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
  
  // 로깅용 함수들 (UI에는 표시 안함)
  const getStatusMessage = (currentProgress: number) => {
    if (currentProgress < 20) {
      return 'Initializing AI model...';
    } else if (currentProgress < 40) {
      return 'Analyzing image and preparing effects...';
    } else if (currentProgress < 80) {
      return 'Generating motion... This may take a few minutes...';
    } else if (currentProgress < 95) {
      return 'Finalizing video and encoding...';
    } else {
      return 'Almost done...';
    }
  };
  
  const getElapsedTime = () => {
    const elapsedMs = Date.now() - startTimeRef.current;
    const elapsedSeconds = Math.floor(elapsedMs / 1000);
    
    if (elapsedSeconds < 60) {
      return `${elapsedSeconds}s`;
    } else {
      const mins = Math.floor(elapsedSeconds / 60);
      const secs = elapsedSeconds % 60;
      return `${mins}m ${secs}s`;
    }
  };
  
  const getEstimatedRemaining = (currentProgress: number) => {
    const elapsedMs = Date.now() - startTimeRef.current;
    const elapsedSeconds = Math.floor(elapsedMs / 1000);
    const totalExpectedSeconds = 225; // 3분 45초 기준
    const estimatedRemainingSeconds = Math.max(0, totalExpectedSeconds - elapsedSeconds);
    
    if (estimatedRemainingSeconds === 0 || currentProgress >= 95) {
      return 'Finishing up...';
    }
    
    const mins = Math.floor(estimatedRemainingSeconds / 60);
    const secs = estimatedRemainingSeconds % 60;
    
    if (mins === 0) {
      return `~${secs}s`;
    }
    return `~${mins}m ${secs}s`;
  };
  
  // Progress 변화 시 로깅
  useEffect(() => {
    if (isVisible && progress !== previousProgressRef.current) {
      console.log('[VideoGeneration]', {
        jobId: jobId || 'unknown',
        progress: progress,
        status: getStatusMessage(progress),
        elapsedTime: getElapsedTime(),
        estimatedRemaining: getEstimatedRemaining(progress),
        timestamp: new Date().toISOString()
      });
      
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