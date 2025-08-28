'use client';

import { useEffect } from 'react';

interface RenderingModalProps {
  isOpen: boolean;
  onClose: () => void;
  renderProgress: number;
  renderComplete: boolean;
  renderOutputUrl: string | null;
}

export default function RenderingModal({
  isOpen,
  onClose,
  renderProgress,
  renderComplete,
  renderOutputUrl
}: RenderingModalProps) {
  // ESC 키로 모달 닫기
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && renderComplete) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      // 모달이 열릴 때 body 스크롤 방지
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, renderComplete, onClose]);

  if (!isOpen) return null;

  const handleDownload = () => {
    if (renderOutputUrl) {
      const link = document.createElement('a');
      link.href = renderOutputUrl;
      link.download = `video-${Date.now()}.mp4`;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      {/* 배경 오버레이 */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={renderComplete ? onClose : undefined}
      />
      
      {/* 모달 컨텐츠 */}
      <div className="relative z-10 mx-auto max-w-md">
        <div className="flex flex-col items-center gap-4 p-8 bg-gray-900/95 rounded-2xl backdrop-blur-md border border-gray-700 shadow-2xl">
          {renderComplete ? (
            <>
              {/* 렌더링 완료 */}
              <button
                onClick={onClose}
                className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-gray-800 hover:bg-gray-700 transition-colors"
              >
                <i className="ri-close-line text-white text-lg"></i>
              </button>
              
              <div className="relative">
                <div className="w-20 h-20 bg-gradient-to-r from-[#38f47cf9] to-[#4affb0] rounded-full flex items-center justify-center animate-pulse">
                  <i className="ri-check-line text-4xl text-white"></i>
                </div>
              </div>
              
              <div className="text-center">
                <p className="text-white text-xl font-medium mb-2">Rendering Complete!</p>
                <p className="text-gray-400 text-sm mb-6">Your video is ready to download</p>
              </div>
              
              <button
                onClick={handleDownload}
                className="px-6 py-3 bg-[#38f47cf9] text-black rounded-xl hover:bg-[#4affb0] transition-colors text-base font-medium flex items-center gap-2"
              >
                <i className="ri-download-line text-xl"></i>
                Download Video
              </button>
              
              <button
                onClick={onClose}
                className="mt-2 px-6 py-2 text-gray-400 hover:text-white transition-colors text-sm"
              >
                Close
              </button>
            </>
          ) : (
            <>
              {/* 렌더링 진행 중 */}
              <div className="relative">
                <div className="w-20 h-20 border-4 border-gray-600 border-t-[#38f47cf9] rounded-full animate-spin"></div>
                <i className="ri-vidicon-line text-3xl text-[#38f47cf9] absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"></i>
              </div>
              
              <div className="text-center">
                <p className="text-white text-xl font-medium mb-2">
                  Rendering Video...
                </p>
                <p className="text-gray-400 text-sm">Please wait, this may take a few minutes</p>
              </div>
              
              {/* 진행률 바 */}
              <div className="w-80">
                <div className="flex justify-between text-xs text-gray-400 mb-2">
                  <span>Progress</span>
                  <span>{renderProgress}%</span>
                </div>
                <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-[#38f47cf9] to-[#4affb0] transition-all duration-500 ease-out"
                    style={{ width: `${renderProgress}%` }}
                  />
                </div>
              </div>
              
              {/* 상태 메시지 */}
              <p className="text-xs text-gray-500 text-center">
                {renderProgress < 30 
                  ? 'Initializing render engine...' 
                  : renderProgress < 50
                    ? 'Processing video frames...'
                    : renderProgress < 70 
                      ? 'Applying effects and transitions...' 
                      : renderProgress < 90
                        ? 'Encoding video...'
                        : 'Finalizing output...'}
              </p>
              
              {/* 취소 불가 안내 */}
              <p className="text-xs text-gray-600 text-center mt-2">
                Please do not close this window
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}