'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { SoundClip as SoundClipType } from '@/types/video-editor';
import { drawWaveformFinalCutStyle, resampleWaveform } from '../_utils/audio-analysis';

interface SoundClipProps {
  clip: SoundClipType;
  onEdit?: (clip: SoundClipType) => void;
  onDelete?: (id: string) => void;
  onResizeStart?: (e: React.MouseEvent, handle: 'left' | 'right') => void;
  onVolumeChange?: (id: string, volume: number) => void;
  isActive?: boolean;
  pixelsPerSecond?: number;
}

export default function SoundClip({
  clip,
  onEdit,
  onResizeStart,
  onVolumeChange,
  isActive = false,
  pixelsPerSecond = 40,
}: SoundClipProps) {
  const clipRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const volumeLineRef = useRef<HTMLDivElement>(null);
  const [isDraggingVolume, setIsDraggingVolume] = useState(false);
  const [tempVolume, setTempVolume] = useState(clip.volume);
  const [isHoveringVolumeLine, setIsHoveringVolumeLine] = useState(false);
  const dragStartY = useRef<number>(0);
  const dragStartVolume = useRef<number>(clip.volume);

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

  // Draw Final Cut Pro style waveform
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
  }, [clip.waveformData, clip.duration, tempVolume, isActive]);

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

  // Calculate volume line position 
  // Center (20px) = 100%, Bottom (40px) = 0%
  const volumeLinePosition = 40 - (tempVolume / 100) * 20; // 0-100%: from bottom (40px) to center (20px)

  return (
    <div
      ref={clipRef}
      className={`group relative w-full h-full ${isActive ? 'z-10' : ''}`}
      onDoubleClick={handleDoubleClick}
    >
      <div className={`relative w-full h-10 bg-slate-800/70 backdrop-blur-sm rounded overflow-hidden ${
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
          className={`absolute left-0 right-0 h-[3px] cursor-ns-resize transition-all ${
            isDraggingVolume ? 'bg-yellow-400 shadow-lg' : 
            isHoveringVolumeLine ? 'bg-cyan-400 shadow-md' : 
            'bg-cyan-500/80'
          }`}
          style={{ 
            top: `${volumeLinePosition}px`,
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
          }`} />
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
        
        {/* Clip info overlay */}
        <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-2 py-1 pointer-events-none">
          <div className="flex items-center gap-1">
            <i className="ri-volume-up-line text-[10px] text-cyan-300 flex-shrink-0"></i>
            <span className="text-[10px] text-white/90 truncate max-w-[100px] font-medium">
              {clip.name}
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Volume percentage display */}
            {(isDraggingVolume || isHoveringVolumeLine) && (
              <span className="text-[10px] text-cyan-300 font-mono bg-black/60 px-1 rounded">
                {Math.round(tempVolume)}%
              </span>
            )}
            <span className="text-[10px] text-gray-400 whitespace-nowrap">
              {formatDuration(clip.duration)}
            </span>
          </div>
        </div>
        
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
      </div>
    </div>
  );
}