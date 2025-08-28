/**
 * TimelineControls - 타임라인 제어 패널 컴포넌트 🎮
 * 
 * 📌 주요 역할:
 * 1. 재생/일시정지 버튼으로 영상 재생 제어
 * 2. 시간 표시 및 수동 시간 입력 기능
 * 3. 실행 취소/다시 실행 버튼 제공
 * 4. 전체 재생 시간 대비 현재 위치 표시
 * 
 * 🎯 핵심 특징:
 * - 직관적인 재생 컨트롤 UI (Play/Pause 토글)
 * - 시간 포맷 변환 (초 → MM:SS 형식)
 * - 실시간 시간 업데이트 반영
 * - Undo/Redo 기능 활성화 상태 관리
 * 
 * 🚧 주의사항:
 * - 시간은 초 단위로 전달받아 MM:SS 형식으로 변환
 * - 실행 취소/다시 실행은 상위 컴포넌트의 상태에 따라 활성화
 * - 사용자가 시간을 직접 입력할 수 있는 인터페이스 제공
 */
'use client';

import { useEffect, useState } from 'react';

/**
 * TimelineControls Props 인터페이스 🎛️
 */
interface TimelineControlsProps {
  /** ▶️ 현재 재생 상태 */
  isPlaying: boolean;
  /** ⏱️ 현재 재생 시간 (초 단위) */
  currentTime: number;
  /** ⏱️ 총 재생 시간 (초 단위) */
  totalDuration: number;
  /** ⏯️ 재생/일시정지 토글 핸들러 */
  onPlayPause: () => void;
  /** 🎯 시간 이동 핸들러 */
  onSeek: (time: number) => void;
  /** ↶ 실행 취소 핸들러 */
  onUndo?: () => void;
  /** ↷ 다시 실행 핸들러 */
  onRedo?: () => void;
  /** ↶ 실행 취소 가능 여부 */
  canUndo?: boolean;
  /** ↷ 다시 실행 가능 여부 */
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
  // 최대 3분(180초)까지만 표시
  const formatTime = (seconds: number): string => {
    // 3분을 초과하는 경우 3:00.00으로 캡핑
    const clampedSeconds = Math.min(seconds, 180);
    const minutes = Math.floor(clampedSeconds / 60);
    const secs = Math.floor(clampedSeconds % 60);
    const frames = Math.floor((clampedSeconds % 1) * 30); // 30fps 기준
    
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
          className={`btn-icon transition-colors relative group ${
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
          className={`btn-icon transition-colors relative group ${
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
          className="btn-icon hover:bg-gray-800 transition-colors text-gray-400 hover:text-white relative group"
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
          className="w-10 h-10 flex-center rounded-full bg-[#38f47cf9] hover:bg-[#38f47c] transition-colors text-black relative group"
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
          <span className={totalDuration > 180 ? "text-red-400" : "text-body-secondary"}>{displayDuration}</span>
          {totalDuration > 180 && (
            <span className="text-red-400 ml-2 text-[14px] font-sans">
              (Exceeds 3:00 limit)
            </span>
          )}
        </div>
      </div>

      {/* 우측: 빈 공간 */}
      <div className="w-8" />
    </div>
  );
}