import React from 'react';

interface VideoGenerationProgressProps {
  progress: number;
  isVisible: boolean;
  webhookStatus?: string;
  elapsedMinutes?: number;
  elapsedSeconds?: number;
}

export function VideoGenerationProgress({ 
  progress, 
  isVisible, 
  webhookStatus,
  elapsedMinutes = 0,
  elapsedSeconds = 0
}: VideoGenerationProgressProps) {
  if (!isVisible) return null;

  const getStatusMessage = () => {
    // 단계별 메시지 표시
    if (progress < 20) {
      return 'Initializing AI model...';
    } else if (progress < 40) {
      return 'Analyzing image and preparing effects...';
    } else if (progress < 80) {
      return 'Generating motion... This may take a few minutes...';
    } else if (progress < 95) {
      return 'Finalizing video and encoding...';
    } else {
      return 'Almost done...';
    }
  };
  
  const getTimeDisplay = () => {
    if (elapsedSeconds < 60) {
      return `${elapsedSeconds}s elapsed`;
    } else {
      const mins = Math.floor(elapsedSeconds / 60);
      const secs = elapsedSeconds % 60;
      return `${mins}m ${secs}s elapsed`;
    }
  };
  
  const getEstimatedTime = () => {
    // 225초(3분 45초) 기준으로 예상 시간 계산
    const totalExpectedSeconds = 225;
    const estimatedRemainingSeconds = Math.max(0, totalExpectedSeconds - elapsedSeconds);
    
    if (estimatedRemainingSeconds === 0) {
      return 'Finishing up...';
    }
    
    const mins = Math.floor(estimatedRemainingSeconds / 60);
    const secs = estimatedRemainingSeconds % 60;
    
    if (mins === 0) {
      return `~${secs}s remaining`;
    }
    return `~${mins}m ${secs}s remaining`;
  };

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
      
      {/* Progress info container */}
      <div className="text-center">
        {/* Percentage display with shadow for better visibility */}
        <div className="text-white text-7xl font-bold drop-shadow-2xl mb-4">
          {Math.round(progress)}%
        </div>
        
        {/* Status message */}
        <div className="text-white text-sm font-medium px-4 py-2 bg-black/50 rounded-lg mb-2">
          {getStatusMessage()}
        </div>
        
        {/* Time display */}
        <div className="text-white/80 text-xs px-3 py-1 bg-black/30 rounded-lg">
          <span>{getTimeDisplay()}</span>
          {progress < 95 && <span className="mx-2">•</span>}
          {progress < 95 && <span>{getEstimatedTime()}</span>}
        </div>
        
        {/* Webhook status indicator */}
        {webhookStatus && (
          <div className="mt-2 text-xs text-gray-400">
            {webhookStatus === 'pending' && elapsedMinutes >= 5 && (
              <span className="flex items-center justify-center gap-1">
                <span className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />
                Webhook pending... starting fal.ai direct check
              </span>
            )}
            {webhookStatus === 'delivered' && (
              <span className="flex items-center justify-center gap-1">
                <span className="w-2 h-2 bg-green-500 rounded-full" />
                Webhook received
              </span>
            )}
            {webhookStatus === 'timeout' && (
              <span className="flex items-center justify-center gap-1">
                <span className="w-2 h-2 bg-orange-500 rounded-full" />
                Webhook timeout - using backup path
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}