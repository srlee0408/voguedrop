/**
 * SoundClip - 사운드 클립 컴포넌트 🎵
 * 
 * 📌 주요 역할:
 * 1. 타임라인에서 오디오 클립의 시각적 표현 및 오디오 컨트롤
 * 2. Canvas를 이용한 실시간 웨이브폼 시각화
 * 3. 볼륨 조절 및 페이드 인/아웃 효과 설정 UI
 * 4. 오디오 파일 메타데이터 표시 및 리사이즈 핸들 제공
 * 
 * 🎯 핵심 특징:
 * - Final Cut Pro 스타일의 웨이브폼 시각화
 * - 실시간 볼륨 슬라이더 및 페이드 효과 컨트롤
 * - 줌 레벨에 따른 웨이브폼 리샘플링
 * - 오디오 파일명과 지속시간 정보 표시
 * - 좌우 리사이즈 핸들로 클립 트림 기능
 * 
 * 🚧 주의사항:
 * - Canvas 기반 웨이브폼 렌더링으로 성능 고려 필요
 * - 오디오 데이터 로딩 상태와 에러 처리 중요
 * - 줌 변경 시 웨이브폼 재계산으로 인한 지연 가능성
 * - 볼륨 변경 시 실시간 피드백 제공
 */
'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { SoundClip as SoundClipType } from '@/shared/types/video-editor';
import { drawWaveformFinalCutStyle, resampleWaveform } from '../_utils/audio-analysis';

interface SoundClipProps {
  clip: SoundClipType;
  onEdit?: (clip: SoundClipType) => void;
  onDelete?: (id: string) => void;
  onResizeStart?: (e: React.MouseEvent, handle: 'left' | 'right') => void;
  onVolumeChange?: (id: string, volume: number) => void;
  onFadeChange?: (id: string, fadeType: 'fadeIn' | 'fadeOut', duration: number) => void;
  isActive?: boolean;
  pixelsPerSecond?: number;
  clipWidth?: number;
}

export default function SoundClip({
  clip,
  onEdit,
  onResizeStart,
  onVolumeChange,
  onFadeChange,
  isActive = false,
  pixelsPerSecond = 40,
  clipWidth = 200,
}: SoundClipProps) {
  const clipRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const volumeLineRef = useRef<HTMLDivElement>(null);
  const [isDraggingVolume, setIsDraggingVolume] = useState(false);
  const [tempVolume, setTempVolume] = useState(clip.volume);
  const [isHoveringVolumeLine, setIsHoveringVolumeLine] = useState(false);
  const [isDraggingFadeIn, setIsDraggingFadeIn] = useState(false);
  const [isDraggingFadeOut, setIsDraggingFadeOut] = useState(false);
  const [tempFadeIn, setTempFadeIn] = useState(clip.fadeInDuration || 0);
  const [tempFadeOut, setTempFadeOut] = useState(clip.fadeOutDuration || 0);
  const [isHoveringFadeIn, setIsHoveringFadeIn] = useState(false);
  const [isHoveringFadeOut, setIsHoveringFadeOut] = useState(false);
  const dragStartY = useRef<number>(0);
  const dragStartVolume = useRef<number>(clip.volume);
  const dragStartX = useRef<number>(0);
  const dragStartFade = useRef<number>(0);

  const handleDoubleClick = () => {
    if (onEdit) {
      onEdit(clip);
    }
  };

  const formatDuration = (duration: number) => {
    const totalSeconds = Math.floor(duration / pixelsPerSecond);
    const minutes = Math.floor(totalSeconds / 60);
    const remainingSeconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Draw Final Cut Pro style waveform with fade visualization
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Set canvas size to match container
    const container = clipRef.current;
    if (container) {
      canvas.width = container.clientWidth;
      canvas.height = 40; // Fixed height for sound clips
    }

    // Draw waveform or placeholder
    if (clip.waveformData && clip.waveformData.length > 0) {
      // Calculate how many samples we need for current width
      const samplesNeeded = Math.min(canvas.width, 300); // More samples for detailed waveform
      const resampledData = resampleWaveform(clip.waveformData, samplesNeeded);
      
      // Use Final Cut Pro style rendering
      drawWaveformFinalCutStyle(canvas, resampledData, tempVolume, isActive);
    } else {
      // Draw placeholder waveform
      const placeholderData = Array(100).fill(0).map(() => 0.3 + Math.random() * 0.4);
      drawWaveformFinalCutStyle(canvas, placeholderData, tempVolume, isActive);
    }

    // Draw fade areas on top of waveform
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Draw fade in area
    if (tempFadeIn > 0) {
      const fadeInWidth = tempFadeIn;
      const gradient = ctx.createLinearGradient(0, 0, fadeInWidth, 0);
      gradient.addColorStop(0, 'rgba(34, 211, 238, 0.4)'); // Slightly more visible
      gradient.addColorStop(0.5, 'rgba(34, 211, 238, 0.2)');
      gradient.addColorStop(1, 'rgba(34, 211, 238, 0)');
      
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, fadeInWidth, canvas.height);
      
      // Draw fade in curve line (베지어 곡선)
      ctx.strokeStyle = 'rgba(34, 211, 238, 0.9)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, canvas.height); // Start at bottom left
      
      // 상단 (0px = 최대 볼륨)
      const topY = 5; // 상단에서 약간 떨어진 위치
      
      // 베지어 곡선 - 빠른 상승 후 상단에 도달
      ctx.quadraticCurveTo(
        fadeInWidth * 0.4,  // Control point X (40% 지점)
        topY + 10,          // Control point Y (거의 상단)
        fadeInWidth,        // End point X
        topY               // End point Y (상단)
      );
      ctx.stroke();
      
      // Draw handle connection line at 1/3 height
      ctx.strokeStyle = 'rgba(34, 211, 238, 0.3)';
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 2]);
      ctx.beginPath();
      ctx.moveTo(fadeInWidth, 0);
      ctx.lineTo(fadeInWidth, canvas.height);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Draw fade out area
    if (tempFadeOut > 0) {
      const fadeOutStart = canvas.width - tempFadeOut;
      const gradient = ctx.createLinearGradient(canvas.width, 0, fadeOutStart, 0);
      gradient.addColorStop(0, 'rgba(34, 211, 238, 0.4)'); // Slightly more visible
      gradient.addColorStop(0.5, 'rgba(34, 211, 238, 0.2)');
      gradient.addColorStop(1, 'rgba(34, 211, 238, 0)');
      
      ctx.fillStyle = gradient;
      ctx.fillRect(fadeOutStart, 0, tempFadeOut, canvas.height);
      
      // Draw fade out curve line (베지어 곡선)
      ctx.strokeStyle = 'rgba(34, 211, 238, 0.9)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      
      // 상단 (0px = 최대 볼륨)
      const topY = 5; // 상단에서 약간 떨어진 위치
      ctx.moveTo(fadeOutStart, topY); // Start at top (max volume)
      
      // 베지어 곡선 - 상단에서 시작해서 빠르게 하강 (ease-in)
      ctx.quadraticCurveTo(
        fadeOutStart + tempFadeOut * 0.6,  // Control point X (60% 지점)
        topY + 10,                          // Control point Y (거의 상단 유지)
        canvas.width,                       // End point X
        canvas.height                      // End point Y (바닥)
      );
      ctx.stroke();
      
      // Draw handle connection line at 1/3 height
      ctx.strokeStyle = 'rgba(34, 211, 238, 0.3)';
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 2]);
      ctx.beginPath();
      ctx.moveTo(fadeOutStart, 0);
      ctx.lineTo(fadeOutStart, canvas.height);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }, [clip.waveformData, clip.duration, tempVolume, isActive, tempFadeIn, tempFadeOut]);

  // Handle volume line drag start
  const handleVolumeMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation(); // Prevent clip dragging
    setIsDraggingVolume(true);
    dragStartY.current = e.clientY;
    dragStartVolume.current = tempVolume;
  }, [tempVolume]);

  // Handle volume drag
  useEffect(() => {
    if (!isDraggingVolume) return;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaY = dragStartY.current - e.clientY; // Up increases volume
      const volumeChange = (deltaY / 20) * 100; // 20px = 100% volume change
      
      let newVolume = dragStartVolume.current + volumeChange;
      
      // Snap to 5% increments if Shift is held
      if (e.shiftKey) {
        newVolume = Math.round(newVolume / 5) * 5;
      }
      
      // Clamp between 0 and 100
      newVolume = Math.max(0, Math.min(100, newVolume));
      setTempVolume(newVolume);
    };

    const handleMouseUp = () => {
      setIsDraggingVolume(false);
      if (onVolumeChange && tempVolume !== clip.volume) {
        onVolumeChange(clip.id, tempVolume);
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDraggingVolume, clip.id, clip.volume, tempVolume, onVolumeChange]);

  // Update temp volume when clip volume changes externally
  useEffect(() => {
    setTempVolume(clip.volume);
  }, [clip.volume]);

  // Update temp fade values when clip fade changes externally
  useEffect(() => {
    setTempFadeIn(clip.fadeInDuration || 0);
    setTempFadeOut(clip.fadeOutDuration || 0);
  }, [clip.fadeInDuration, clip.fadeOutDuration]);
  
  // Auto-adjust fade values when clip duration changes
  useEffect(() => {
    const minGap = 10;
    const maxFadeIn = Math.min(
      tempFadeIn,
      clip.duration * 0.5,
      clip.duration - tempFadeOut - minGap
    );
    const maxFadeOut = Math.min(
      tempFadeOut,
      clip.duration * 0.5,
      clip.duration - tempFadeIn - minGap
    );
    
    // Adjust fade in if it exceeds new limits
    if (tempFadeIn > maxFadeIn) {
      setTempFadeIn(Math.max(0, maxFadeIn));
      if (onFadeChange && maxFadeIn >= 0) {
        onFadeChange(clip.id, 'fadeIn', Math.max(0, maxFadeIn));
      }
    }
    
    // Adjust fade out if it exceeds new limits
    if (tempFadeOut > maxFadeOut) {
      setTempFadeOut(Math.max(0, maxFadeOut));
      if (onFadeChange && maxFadeOut >= 0) {
        onFadeChange(clip.id, 'fadeOut', Math.max(0, maxFadeOut));
      }
    }
  }, [clip.duration, clip.id, tempFadeIn, tempFadeOut, onFadeChange]);

  // Handle fade in drag start
  const handleFadeInMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingFadeIn(true);
    dragStartX.current = e.clientX;
    dragStartFade.current = tempFadeIn;
  }, [tempFadeIn]);

  // Handle fade out drag start
  const handleFadeOutMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingFadeOut(true);
    dragStartX.current = e.clientX;
    dragStartFade.current = tempFadeOut;
  }, [tempFadeOut]);

  // Handle fade in drag
  useEffect(() => {
    if (!isDraggingFadeIn) return;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - dragStartX.current;
      let newFadeIn = dragStartFade.current + deltaX;
      
      // Limit fade in to not overlap with fade out (minimum 10px gap)
      const minGap = 10; // Minimum gap between fade in and fade out
      const maxFadeSeconds = 10; // Maximum 10 seconds
      const maxFadePixels = maxFadeSeconds * pixelsPerSecond; // Convert to pixels
      
      const maxFadeIn = Math.min(
        maxFadePixels, // Maximum 10 seconds
        clip.duration * 0.5, // Maximum 50% of clip
        clip.duration - tempFadeOut - minGap // Don't overlap with fade out
      );
      newFadeIn = Math.max(0, Math.min(maxFadeIn, newFadeIn));
      
      // Snap to 0.5 second increments if Shift is held
      if (e.shiftKey) {
        const snapInterval = pixelsPerSecond * 0.5; // 0.5 second
        newFadeIn = Math.round(newFadeIn / snapInterval) * snapInterval;
      }
      
      setTempFadeIn(newFadeIn);
    };

    const handleMouseUp = () => {
      setIsDraggingFadeIn(false);
      if (onFadeChange && tempFadeIn !== (clip.fadeInDuration || 0)) {
        onFadeChange(clip.id, 'fadeIn', tempFadeIn);
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDraggingFadeIn, clip.id, clip.fadeInDuration, clip.duration, tempFadeIn, tempFadeOut, onFadeChange, pixelsPerSecond]);

  // Handle fade out drag
  useEffect(() => {
    if (!isDraggingFadeOut) return;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = dragStartX.current - e.clientX; // Reverse direction for fade out
      let newFadeOut = dragStartFade.current + deltaX;
      
      // Limit fade out to not overlap with fade in (minimum 10px gap)
      const minGap = 10; // Minimum gap between fade in and fade out
      const maxFadeSeconds = 10; // Maximum 10 seconds
      const maxFadePixels = maxFadeSeconds * pixelsPerSecond; // Convert to pixels
      
      const maxFadeOut = Math.min(
        maxFadePixels, // Maximum 10 seconds
        clip.duration * 0.5, // Maximum 50% of clip
        clip.duration - tempFadeIn - minGap // Don't overlap with fade in
      );
      newFadeOut = Math.max(0, Math.min(maxFadeOut, newFadeOut));
      
      // Snap to 0.5 second increments if Shift is held
      if (e.shiftKey) {
        const snapInterval = pixelsPerSecond * 0.5; // 0.5 second
        newFadeOut = Math.round(newFadeOut / snapInterval) * snapInterval;
      }
      
      setTempFadeOut(newFadeOut);
    };

    const handleMouseUp = () => {
      setIsDraggingFadeOut(false);
      if (onFadeChange && tempFadeOut !== (clip.fadeOutDuration || 0)) {
        onFadeChange(clip.id, 'fadeOut', tempFadeOut);
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDraggingFadeOut, clip.id, clip.fadeOutDuration, clip.duration, tempFadeIn, tempFadeOut, onFadeChange, pixelsPerSecond]);

  // Calculate volume line position 
  // Center (20px) = 100%, Bottom (40px) = 0%
  const volumeLinePosition = 40 - (tempVolume / 100) * 20; // 0-100%: from bottom (40px) to center (20px)

  return (
    <div
      ref={clipRef}
      className={`group relative w-full h-full select-none ${isActive ? 'z-10' : ''}`}
      onDoubleClick={handleDoubleClick}
    >
      <div className={`relative w-full h-10 bg-slate-800/70 backdrop-blur-sm rounded overflow-hidden cursor-pointer ${
        isActive ? 'ring-2 ring-[#38f47cf9]' : ''
      }`}>
        {/* Background with subtle gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-slate-900/50 to-slate-800/50" />
        
        {/* Waveform Canvas */}
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full"
          style={{ imageRendering: 'auto' }}
        />
        
        {/* Volume adjustment line (horizontal) */}
        <div
          ref={volumeLineRef}
          className={`absolute left-0 right-0 h-[3px] cursor-ns-resize ${
            isDraggingVolume ? 'bg-yellow-400 shadow-lg' : 
            isHoveringVolumeLine ? 'bg-cyan-400 shadow-md' : 
            'bg-cyan-500/80'
          }`}
          style={{ 
            top: `${volumeLinePosition}px`,
            transition: isDraggingVolume ? 'none' : 'all 0.15s ease-out', // 드래그 중에는 transition 제거
            boxShadow: isDraggingVolume ? '0 0 8px rgba(250, 204, 21, 0.5)' : 
                      isHoveringVolumeLine ? '0 0 4px rgba(34, 211, 238, 0.3)' : 'none'
          }}
          onMouseDown={handleVolumeMouseDown}
          onMouseEnter={() => setIsHoveringVolumeLine(true)}
          onMouseLeave={() => setIsHoveringVolumeLine(false)}
        >
          {/* Volume handle dot */}
          <div className={`absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full ${
            isDraggingVolume ? 'bg-yellow-400' : 'bg-cyan-400'
          }`} 
          style={{
            transition: isDraggingVolume ? 'none' : 'all 0.15s ease-out' // 드래그 중에는 transition 제거
          }}
          />
        </div>
        
        {/* Max volume line at center (100% volume) */}
        <div className="absolute left-0 right-0 h-[1px] bg-white/20" style={{ top: '20px' }}>
          <span className="absolute -left-12 -top-2 text-[8px] text-gray-500">MAX</span>
        </div>
        
        {/* Loading indicator if analyzing */}
        {clip.isAnalyzing && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/30">
            <div className="animate-pulse text-xs text-white">Analyzing...</div>
          </div>
        )}
        
        {/* Clip info overlay - 작을 때 조건부 렌더링 */}
        {clipWidth > 30 && (
          <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-2 py-1 pointer-events-none">
            {clipWidth > 40 ? (
              <>
                <div className="flex items-center gap-1">
                  <i className="ri-volume-up-line text-[10px] text-cyan-300 flex-shrink-0"></i>
                  {clipWidth > 60 && (
                    <span className="text-[10px] text-white/90 truncate max-w-[100px] font-medium">
                      {clip.name}
                    </span>
                  )}
                </div>
                
                <div className="flex items-center gap-2">
                  {/* Volume percentage display */}
                  {(isDraggingVolume || isHoveringVolumeLine) && (
                    <span className="text-[10px] text-cyan-300 font-mono bg-black/60 px-1 rounded">
                      {Math.round(tempVolume)}%
                    </span>
                  )}
                  {clipWidth > 80 && (
                    <span className="text-[10px] text-gray-400 whitespace-nowrap">
                      {formatDuration(clip.duration)}
                    </span>
                  )}
                </div>
              </>
            ) : (
              <i className="ri-volume-up-line text-[10px] text-cyan-300 mx-auto"></i>
            )}
          </div>
        )}
        
        {/* Fade handles */}
        {/* Fade In Handle - top 1/3 height position */}
        <div
          className={`absolute w-2 h-2 rounded-full cursor-ew-resize z-20 border border-gray-600 ${
            isDraggingFadeIn ? 'bg-yellow-400 scale-125 border-yellow-500' : 
            isHoveringFadeIn ? 'bg-white scale-110 border-white' : 
            'bg-gray-300'
          }`}
          style={{ 
            left: `${tempFadeIn}px`,
            top: '33%', // 상단 1/3 지점
            transform: 'translateY(-50%)',
            transition: isDraggingFadeIn ? 'none' : 'all 0.15s ease-out', // 드래그 중에는 transition 제거
            boxShadow: isDraggingFadeIn ? '0 0 8px rgba(250, 204, 21, 0.5)' : 
                      isHoveringFadeIn ? '0 0 6px rgba(255, 255, 255, 0.5)' : '0 0 3px rgba(255, 255, 255, 0.3)'
          }}
          onMouseDown={handleFadeInMouseDown}
          onMouseEnter={() => setIsHoveringFadeIn(true)}
          onMouseLeave={() => setIsHoveringFadeIn(false)}
          title="Drag to adjust fade in"
        />
        
        {/* Fade Out Handle - top 1/3 height position */}
        <div
          className={`absolute w-2 h-2 rounded-full cursor-ew-resize z-20 border border-gray-600 ${
            isDraggingFadeOut ? 'bg-yellow-400 scale-125 border-yellow-500' : 
            isHoveringFadeOut ? 'bg-white scale-110 border-white' : 
            'bg-gray-300'
          }`}
          style={{ 
            right: `${tempFadeOut}px`,
            top: '33%', // 상단 1/3 지점
            transform: 'translateY(-50%)',
            transition: isDraggingFadeOut ? 'none' : 'all 0.15s ease-out', // 드래그 중에는 transition 제거
            boxShadow: isDraggingFadeOut ? '0 0 8px rgba(250, 204, 21, 0.5)' : 
                      isHoveringFadeOut ? '0 0 6px rgba(255, 255, 255, 0.5)' : '0 0 3px rgba(255, 255, 255, 0.3)'
          }}
          onMouseDown={handleFadeOutMouseDown}
          onMouseEnter={() => setIsHoveringFadeOut(true)}
          onMouseLeave={() => setIsHoveringFadeOut(false)}
          title="Drag to adjust fade out"
        />
        
        {/* Resize handles */}
        <div
          className="absolute inset-y-0 left-0 w-1 bg-cyan-500 rounded-l cursor-ew-resize resize-handle hover:w-2 transition-all opacity-60 hover:opacity-100"
          onMouseDown={(e) => {
            e.stopPropagation();
            onResizeStart?.(e, 'left');
          }}
        />
        <div
          className="absolute inset-y-0 right-0 w-1 bg-cyan-500 rounded-r cursor-ew-resize resize-handle hover:w-2 transition-all opacity-60 hover:opacity-100"
          onMouseDown={(e) => {
            e.stopPropagation();
            onResizeStart?.(e, 'right');
          }}
        />
        
        {/* Visual feedback when dragging volume */}
        {isDraggingVolume && (
          <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-black/90 text-white px-2 py-1 rounded text-xs whitespace-nowrap pointer-events-none z-50">
            Volume: {Math.round(tempVolume)}%
            {tempVolume === 0 && <span className="text-red-400 ml-1">(Muted)</span>}
            {tempVolume === 100 && <span className="text-green-400 ml-1">(Max)</span>}
          </div>
        )}
        
        {/* Visual feedback when dragging fade in */}
        {isDraggingFadeIn && (
          <div 
            className="absolute -top-8 bg-black/90 text-white px-2 py-1 rounded text-xs whitespace-nowrap pointer-events-none z-50"
            style={{ left: `${tempFadeIn}px` }}
          >
            Fade In: {(tempFadeIn / pixelsPerSecond).toFixed(1)}s
          </div>
        )}
        
        {/* Visual feedback when dragging fade out */}
        {isDraggingFadeOut && (
          <div 
            className="absolute -top-8 bg-black/90 text-white px-2 py-1 rounded text-xs whitespace-nowrap pointer-events-none z-50"
            style={{ right: `${tempFadeOut}px` }}
          >
            Fade Out: {(tempFadeOut / pixelsPerSecond).toFixed(1)}s
          </div>
        )}
      </div>
    </div>
  );
}