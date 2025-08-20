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
          className={`w-8 h-8 flex items-center justify-center rounded transition-colors relative group ${
            canUndo 
              ? 'hover:bg-gray-800 text-gray-400 hover:text-white cursor-pointer' 
              : 'text-gray-600 cursor-not-allowed opacity-50'
          }`}
          onClick={onUndo}
          disabled={!canUndo}
          title="실행 취소 (Undo)"
        >
          <i className="ri-arrow-go-back-line text-lg"></i>
          {/* 영어 툴팁 */}
          <span className={`absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 text-xs bg-gray-800 text-white rounded whitespace-nowrap pointer-events-none transition-opacity ${
            canUndo ? 'opacity-0 group-hover:opacity-100' : 'opacity-0'
          }`}>
            Undo
          </span>
        </button>
        <button
          className={`w-8 h-8 flex items-center justify-center rounded transition-colors relative group ${
            canRedo 
              ? 'hover:bg-gray-800 text-gray-400 hover:text-white cursor-pointer' 
              : 'text-gray-600 cursor-not-allowed opacity-50'
          }`}
          onClick={onRedo}
          disabled={!canRedo}
          title="다시 실행 (Redo)"
        >
          <i className="ri-arrow-go-forward-line text-lg"></i>
          {/* 영어 툴팁 */}
          <span className={`absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 text-xs bg-gray-800 text-white rounded whitespace-nowrap pointer-events-none transition-opacity ${
            canRedo ? 'opacity-0 group-hover:opacity-100' : 'opacity-0'
          }`}>
            Redo
          </span>
        </button>
      </div>

      {/* 중앙: 재생 컨트롤 및 타임코드 */}
      <div className="flex items-center gap-3">
        {/* 처음으로 버튼 */}
        <button
          className="w-8 h-8 flex items-center justify-center rounded hover:bg-gray-800 transition-colors text-gray-400 hover:text-white relative group"
          onClick={() => onSeek(0)}
          title="처음으로 (Skip to Start)"
        >
          <i className="ri-skip-back-line text-lg"></i>
          {/* 영어 툴팁 */}
          <span className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 text-xs bg-gray-800 text-white rounded whitespace-nowrap pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
            Skip to Start
          </span>
        </button>

        {/* 재생/일시정지 버튼 */}
        <button
          className="w-10 h-10 flex items-center justify-center rounded-full bg-[#38f47cf9] hover:bg-[#38f47c] transition-colors text-black relative group"
          onClick={onPlayPause}
          title={isPlaying ? '일시정지 (Pause)' : '재생 (Play)'}
        >
          <i className={`${isPlaying ? 'ri-pause-fill' : 'ri-play-fill'} text-xl`}></i>
          {/* 영어 툴팁 */}
          <span className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 text-xs bg-gray-800 text-white rounded whitespace-nowrap pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
            {isPlaying ? 'Pause' : 'Play'}
          </span>
        </button>

        {/* 타임코드 표시 */}
        <div className="flex items-center gap-1 ml-2 font-mono text-xs">
          <span className="text-white">{displayTime}</span>
          <span className="text-gray-500">/</span>
          <span className={totalDuration > 120 ? "text-red-400" : "text-gray-400"}>{displayDuration}</span>
          {totalDuration > 120 && (
            <span className="text-red-400 ml-2 text-[14px] font-sans">
              (Exceeds 2:00 limit)
            </span>
          )}
        </div>
      </div>

      {/* 우측: 빈 공간 */}
      <div className="w-8" />
    </div>
  );
}