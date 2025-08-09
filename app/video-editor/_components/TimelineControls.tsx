'use client';

import { useEffect, useState } from 'react';

interface TimelineControlsProps {
  isPlaying: boolean;
  currentTime: number; // in seconds
  totalDuration: number; // in seconds
  onPlayPause: () => void;
  onSeek: (time: number) => void;
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
}

export default function TimelineControls({
  isPlaying,
  currentTime,
  totalDuration,
  onPlayPause,
  onSeek,
  onUndo,
  onRedo,
  canUndo = false,
  canRedo = false,
}: TimelineControlsProps) {
  const [displayTime, setDisplayTime] = useState('00:00.00');
  const [displayDuration, setDisplayDuration] = useState('00:00.00');

  // 시간을 MM:SS.FF 형식으로 포맷팅 (FF는 프레임, 30fps 기준)
  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const frames = Math.floor((seconds % 1) * 30); // 30fps 기준
    
    return `${minutes.toString().padStart(2, '0')}:${secs
      .toString()
      .padStart(2, '0')}.${frames.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    setDisplayTime(formatTime(currentTime));
  }, [currentTime]);

  useEffect(() => {
    setDisplayDuration(formatTime(totalDuration));
  }, [totalDuration]);

  return (
    <div className="flex items-center justify-between px-4 py-2 bg-gray-900 border-b border-gray-700">
      {/* 좌측: Undo/Redo 버튼 */}
      <div className="flex items-center gap-2">
        <button
          className={`w-8 h-8 flex items-center justify-center rounded transition-colors ${
            canUndo 
              ? 'hover:bg-gray-800 text-gray-400 hover:text-white cursor-pointer' 
              : 'text-gray-600 cursor-not-allowed opacity-50'
          }`}
          onClick={onUndo}
          disabled={!canUndo}
          title="실행 취소"
        >
          <i className="ri-arrow-go-back-line text-lg"></i>
        </button>
        <button
          className={`w-8 h-8 flex items-center justify-center rounded transition-colors ${
            canRedo 
              ? 'hover:bg-gray-800 text-gray-400 hover:text-white cursor-pointer' 
              : 'text-gray-600 cursor-not-allowed opacity-50'
          }`}
          onClick={onRedo}
          disabled={!canRedo}
          title="다시 실행"
        >
          <i className="ri-arrow-go-forward-line text-lg"></i>
        </button>
      </div>

      {/* 중앙: 재생 컨트롤 및 타임코드 */}
      <div className="flex items-center gap-3">
        {/* 처음으로 버튼 */}
        <button
          className="w-8 h-8 flex items-center justify-center rounded hover:bg-gray-800 transition-colors text-gray-400 hover:text-white"
          onClick={() => onSeek(0)}
          title="처음으로"
        >
          <i className="ri-skip-back-line text-lg"></i>
        </button>

        {/* 재생/일시정지 버튼 */}
        <button
          className="w-10 h-10 flex items-center justify-center rounded-full bg-[#38f47cf9] hover:bg-[#38f47c] transition-colors text-black"
          onClick={onPlayPause}
          title={isPlaying ? '일시정지' : '재생'}
        >
          <i className={`${isPlaying ? 'ri-pause-fill' : 'ri-play-fill'} text-xl`}></i>
        </button>

        {/* 타임코드 표시 */}
        <div className="flex items-center gap-2 ml-2 font-mono text-sm">
          <span className="text-white">{displayTime}</span>
          <span className="text-gray-500">/</span>
          <span className="text-gray-400">{displayDuration}</span>
        </div>
      </div>

      {/* 우측: 설정 버튼 */}
      <div>
        <button
          className="w-8 h-8 flex items-center justify-center rounded hover:bg-gray-800 transition-colors text-gray-400 hover:text-white"
          title="설정"
        >
          <i className="ri-settings-3-line text-lg"></i>
        </button>
      </div>
    </div>
  );
}