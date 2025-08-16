import React from 'react';
import { AbsoluteFill } from 'remotion';

interface BufferingSpinnerProps {
  message?: string;
  submessage?: string;
  isOverlay?: boolean;
}

export function BufferingSpinner({ 
  message = 'Rendering...', 
  submessage = 'Loading video, text, and audio',
  isOverlay = false 
}: BufferingSpinnerProps) {
  if (isOverlay) {
    // 오버레이 스타일 - 완전히 검은 화면으로 덮기
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-black rounded-lg z-50">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-gray-600 rounded-full"></div>
            <div className="absolute top-0 left-0 w-16 h-16 border-4 border-[#38f47cf9] rounded-full border-t-transparent animate-spin"></div>
          </div>
          <p className="text-white text-lg font-medium">{message}</p>
          <p className="text-gray-400 text-sm">{submessage}</p>
        </div>
      </div>
    );
  }

  // Remotion Player의 renderPoster에서 사용할 스타일
  return (
    <AbsoluteFill style={{ 
      justifyContent: 'center', 
      alignItems: 'center',
      backgroundColor: 'black'
    }}>
      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-gray-600 rounded-full"></div>
          <div className="absolute top-0 left-0 w-16 h-16 border-4 border-[#38f47cf9] rounded-full border-t-transparent animate-spin"></div>
        </div>
        <p className="text-white text-lg font-medium">{message}</p>
        {submessage && <p className="text-gray-400 text-sm">{submessage}</p>}
      </div>
    </AbsoluteFill>
  );
}