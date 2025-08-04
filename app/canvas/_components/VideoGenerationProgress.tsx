import React from 'react';

interface VideoGenerationProgressProps {
  progress: number;
  isVisible: boolean;
  webhookStatus?: string;
  elapsedMinutes?: number;
}

export function VideoGenerationProgress({ 
  progress, 
  isVisible, 
  webhookStatus,
  elapsedMinutes = 0 
}: VideoGenerationProgressProps) {
  if (!isVisible) return null;

  const getStatusMessage = () => {
    if (webhookStatus === 'pending' && elapsedMinutes < 5) {
      return `Generating video... (${elapsedMinutes} min elapsed)`;
    } else if (webhookStatus === 'pending' && elapsedMinutes >= 5) {
      return 'Processing is taking longer than expected. Checking status...';
    } else if (webhookStatus === 'timeout') {
      return 'Checking status via fallback...';
    } else if (webhookStatus === 'delivered') {
      return 'Processing video...';
    }
    return 'Generating video...';
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
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12 animate-shimmer" />
        </div>
      </div>
      
      {/* Progress info container */}
      <div className="text-center">
        {/* Percentage display with shadow for better visibility */}
        <div className="text-white text-7xl font-bold drop-shadow-2xl mb-4">
          {Math.round(progress)}%
        </div>
        
        {/* Status message */}
        <div className="text-white text-sm font-medium px-4 py-2 bg-black/50 rounded-lg">
          {getStatusMessage()}
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