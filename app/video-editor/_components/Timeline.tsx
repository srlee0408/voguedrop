'use client';

import { useState, useEffect, useRef } from 'react';
import { TextClip as TextClipType, SoundClip as SoundClipType } from '@/types/video-editor';
import TextClip from './TextClip';
import SoundClip from './SoundClip';
import TimelineControls from './TimelineControls';

type VideoTimelineClip = {
  id: string;
  duration: number; // current width in px
  thumbnails: number;
  thumbnail?: string;
  url?: string;
  title?: string;
  max_duration_px?: number; // maximum width in px, derived from real video length
};

interface TimelineProps {
  clips: Array<VideoTimelineClip>;
  textClips?: TextClipType[];
  soundClips?: SoundClipType[];
  onAddClip: () => void;
  onAddText?: () => void;
  onAddSound?: () => void;
  onEditTextClip?: (clip: TextClipType) => void;
  onEditSoundClip?: (clip: SoundClipType) => void;
  onDeleteTextClip?: (id: string) => void;
  onDeleteSoundClip?: (id: string) => void;
  onDeleteVideoClip?: (id: string) => void;
  onResizeTextClip?: (id: string, newDuration: number) => void;
  onResizeSoundClip?: (id: string, newDuration: number) => void;
  onReorderVideoClips?: (clips: Array<VideoTimelineClip>) => void;
  onReorderTextClips?: (clips: TextClipType[]) => void;
  onReorderSoundClips?: (clips: SoundClipType[]) => void;
  onResizeVideoClip?: (id: string, newDuration: number) => void;
  pixelsPerSecond?: number;
  currentTime?: number; // in seconds
  isPlaying?: boolean;
  onSeek?: (time: number) => void;
  onPlayPause?: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
}

export default function Timeline({ 
  clips, 
  textClips = [],
  soundClips = [],
  onAddClip,
  onAddText,
  onAddSound,
  onEditTextClip,
  onEditSoundClip,
  onDeleteTextClip,
  onDeleteSoundClip,
  onDeleteVideoClip,
  onResizeTextClip,
  onResizeSoundClip,
  onReorderVideoClips,
  onReorderTextClips,
  onReorderSoundClips,
  onResizeVideoClip,
  pixelsPerSecond = 40,
  currentTime = 0,
  isPlaying = false,
  onSeek,
  onPlayPause,
  onUndo,
  onRedo,
  canUndo = false,
  canRedo = false,
}: TimelineProps) {
  const [activeClip, setActiveClip] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragStartX, setDragStartX] = useState(0);
  const [startWidth, setStartWidth] = useState(0);
  const [resizeHandle, setResizeHandle] = useState<'left' | 'right' | null>(null);
  const [draggedClip, setDraggedClip] = useState<{ id: string; type: 'video' | 'text' | 'sound'; index: number } | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [dragOverType, setDragOverType] = useState<'video' | 'text' | 'sound' | null>(null);
  const playheadRef = useRef<HTMLDivElement>(null);
  const [isDraggingPlayhead, setIsDraggingPlayhead] = useState(false);

  const handleMouseDown = (e: React.MouseEvent, clipId: string) => {
    if ((e.target as HTMLElement).classList.contains('resize-handle')) {
      return;
    }
    setIsDragging(true);
    setActiveClip(clipId);
    setDragStartX(e.clientX);
  };

  const handleDragStart = (e: React.DragEvent, id: string, type: 'video' | 'text' | 'sound', index: number) => {
    setDraggedClip({ id, type, index });
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, type: 'video' | 'text' | 'sound', index: number) => {
    e.preventDefault();
    if (draggedClip && draggedClip.type === type) {
      setDragOverIndex(index);
      setDragOverType(type);
    }
  };

  const handleDragEnd = () => {
    setDraggedClip(null);
    setDragOverIndex(null);
    setDragOverType(null);
  };

  const handleDrop = (e: React.DragEvent, type: 'video' | 'text' | 'sound', dropIndex: number) => {
    e.preventDefault();
    
    if (!draggedClip || draggedClip.type !== type) return;
    
    if (type === 'video' && onReorderVideoClips) {
      const newClips = [...clips];
      const [movedClip] = newClips.splice(draggedClip.index, 1);
      newClips.splice(dropIndex, 0, movedClip);
      onReorderVideoClips(newClips);
    } else if (type === 'text' && onReorderTextClips) {
      const newClips = [...textClips];
      const [movedClip] = newClips.splice(draggedClip.index, 1);
      newClips.splice(dropIndex, 0, movedClip);
      onReorderTextClips(newClips);
    } else if (type === 'sound' && onReorderSoundClips) {
      const newClips = [...soundClips];
      const [movedClip] = newClips.splice(draggedClip.index, 1);
      newClips.splice(dropIndex, 0, movedClip);
      onReorderSoundClips(newClips);
    }
    
    handleDragEnd();
  };

  const handleResizeStart = (e: React.MouseEvent, clipId: string, handle: 'left' | 'right') => {
    e.stopPropagation();
    setIsResizing(true);
    setResizeHandle(handle);
    setActiveClip(clipId);
    setDragStartX(e.clientX);
    const clipElement = e.currentTarget.closest('.timeline-clip') as HTMLElement;
    setStartWidth(clipElement.offsetWidth);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!activeClip) return;

      if (isResizing) {
        const delta = e.clientX - dragStartX;
        const clipElement = document.querySelector(`[data-clip-id="${activeClip}"]`) as HTMLElement;
        if (clipElement) {
          const clipData = clips.find(c => c.id === activeClip);
          const maxPx = clipData?.max_duration_px ?? Infinity;
          let newWidth;
          if (resizeHandle === 'left') {
            newWidth = Math.max(80, startWidth - delta);
          } else {
            newWidth = Math.max(80, startWidth + delta);
          }
          // 실제 영상 길이 초과 불가
          newWidth = Math.min(newWidth, maxPx);
          clipElement.style.width = `${newWidth}px`;
        }
      } else if (isDragging) {
        const delta = e.clientX - dragStartX;
        const clipElement = document.querySelector(`[data-clip-id="${activeClip}"]`) as HTMLElement;
        if (clipElement) {
          clipElement.style.transform = `translateX(${delta}px)`;
        }
      }
    };

    const handleMouseUp = () => {
      if (activeClip) {
        const clipElement = document.querySelector(`[data-clip-id="${activeClip}"]`) as HTMLElement;
        if (clipElement && isDragging) {
          clipElement.style.transform = '';
        }
        // 리사이징 종료 시, 실제 duration을 업데이트
        if (clipElement && isResizing && onResizeVideoClip) {
          let newWidth = clipElement.offsetWidth;
          const clipData = clips.find(c => c.id === activeClip);
          const maxPx = clipData?.max_duration_px ?? Infinity;
          newWidth = Math.min(newWidth, maxPx);
          onResizeVideoClip(activeClip, newWidth);
        }
      }
      setActiveClip(null);
      setIsDragging(false);
      setIsResizing(false);
      setResizeHandle(null);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [activeClip, isDragging, isResizing, dragStartX, startWidth, resizeHandle, clips, onResizeVideoClip]);

  // 타임라인 눈금: 1칸 = 1초, 30초까지 표시
  const timeMarkers = Array.from({ length: 31 }, (_, i) => {
    const minutes = Math.floor(i / 60);
    const seconds = i % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  });

  // 전체 길이 계산 (초 단위)
  const totalDuration = clips.reduce((sum, clip) => sum + (clip.duration / pixelsPerSecond), 0);

  // 플레이헤드 위치 계산 (픽셀)
  const playheadPosition = currentTime * pixelsPerSecond;

  // 타임라인 클릭으로 seek
  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!onSeek || isResizing || isDragging) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const time = Math.max(0, Math.min(x / pixelsPerSecond, totalDuration));
    onSeek(time);
  };
  
  // 트랙 영역 클릭으로 seek (padding 고려)
  const handleTrackClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!onSeek || isResizing || isDragging) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left - 8; // padding 8px 보정
    const time = Math.max(0, Math.min(x / pixelsPerSecond, totalDuration));
    onSeek(time);
  };


  // 플레이헤드 드래그 핸들러
  const handlePlayheadMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDraggingPlayhead(true);
  };

  useEffect(() => {
    const handlePlayheadMouseMove = (e: MouseEvent) => {
      if (!isDraggingPlayhead || !onSeek) return;
      
      // 타임라인 영역의 위치 계산
      const timelineElement = document.querySelector('.timeline-content');
      if (!timelineElement) return;
      
      const rect = timelineElement.getBoundingClientRect();
      const x = e.clientX - rect.left - 192 - 8; // 192px = 12rem (왼쪽 패널), 8px = padding
      const time = Math.max(0, Math.min(x / pixelsPerSecond, totalDuration));
      onSeek(time);
    };

    const handlePlayheadMouseUp = () => {
      setIsDraggingPlayhead(false);
    };

    if (isDraggingPlayhead) {
      document.addEventListener('mousemove', handlePlayheadMouseMove);
      document.addEventListener('mouseup', handlePlayheadMouseUp);
      return () => {
        document.removeEventListener('mousemove', handlePlayheadMouseMove);
        document.removeEventListener('mouseup', handlePlayheadMouseUp);
      };
    }
  }, [isDraggingPlayhead, onSeek, pixelsPerSecond, totalDuration]);

  return (
    <div className="bg-gray-800 border-t border-gray-700 flex-shrink-0">
      {/* 재생 컨트롤 */}
      <TimelineControls
        isPlaying={isPlaying}
        currentTime={currentTime}
        totalDuration={totalDuration}
        onPlayPause={onPlayPause || (() => {})}
        onSeek={onSeek || (() => {})}
        onUndo={onUndo}
        onRedo={onRedo}
        canUndo={canUndo}
        canRedo={canRedo}
      />
      <div className="relative overflow-hidden timeline-content">
        <div className="flex border-b border-gray-700">
          <div className="w-48 flex-shrink-0 p-2 border-r border-gray-700 flex items-center justify-center">
            <span className="text-xs text-gray-400 font-medium">Add a clip</span>
          </div>
          <div className="flex-1 overflow-x-auto bg-black relative">
              <div 
                className="flex items-center h-8 relative"
                onClick={handleTimelineClick}
                style={{ cursor: 'pointer' }}
              >
                <div className="flex">
                  {timeMarkers.map((time, index) => (
                    <span
                      key={index}
                      className="text-xs text-gray-400 inline-flex items-center"
                      style={{ 
                        width: `${pixelsPerSecond}px`,
                        boxSizing: 'border-box',
                        paddingLeft: index === 0 ? '2px' : '0'
                      }}
                    >
                      {time}
                    </span>
                  ))}
                </div>
              </div>
          </div>
        </div>
        {/* Video Track */}
        <div className="flex border-b border-gray-700">
          <div className="w-48 flex-shrink-0 p-2 border-r border-gray-700">
            <div className="flex flex-col gap-2">
              <button 
                onClick={onAddClip}
                className="w-full h-8 bg-black rounded flex items-center justify-start gap-2 px-3 hover:bg-gray-900 transition-colors group"
              >
                <i className="ri-add-line text-sm text-[#38f47cf9] group-hover:text-white"></i>
                <span className="text-sm text-[#38f47cf9] group-hover:text-white">Add Clip</span>
              </button>
            </div>
          </div>
          <div className="flex-1 p-2 overflow-x-auto" onClick={handleTrackClick}>
            <div className="flex gap-2 items-center overflow-visible">
              {clips.map((clip, index) => (
                <div 
                  key={clip.id}
                  data-clip-id={clip.id}
                  className={`group relative timeline-clip ${
                    dragOverType === 'video' && dragOverIndex === index ? 'opacity-50' : ''
                  }`}
                  style={{ width: `${clip.duration}px`, position: 'relative' }}
                  draggable
                  onDragStart={(e) => handleDragStart(e, clip.id, 'video', index)}
                  onDragOver={(e) => handleDragOver(e, 'video', index)}
                  onDrop={(e) => handleDrop(e, 'video', index)}
                  onDragEnd={handleDragEnd}
                >
                  <div 
                    className="w-full h-8 bg-gradient-to-r from-gray-900 to-gray-800 rounded cursor-pointer hover:from-gray-800 hover:to-gray-700 transition-colors relative overflow-hidden border border-gray-700"
                    onMouseDown={(e) => handleMouseDown(e, clip.id)}
                  >
                    {/* 제목만 표시하는 막대 형태 */}
                    <div className="absolute inset-0 flex items-center">
                      <div className="px-3 py-1 text-xs font-medium text-white/90 truncate">
                        {clip.title || 'Video Clip'}
                      </div>
                    </div>
                    <div 
                      className="absolute inset-y-0 left-0 w-1 bg-[#38f47cf9] rounded-l cursor-ew-resize resize-handle"
                      onMouseDown={(e) => handleResizeStart(e, clip.id, 'left')}
                    />
                    <div 
                      className="absolute inset-y-0 right-0 w-1 bg-[#38f47cf9] rounded-r cursor-ew-resize resize-handle"
                      onMouseDown={(e) => handleResizeStart(e, clip.id, 'right')}
                    />
                  </div>
                  {/* Delete button - 막대 div 밖으로 이동 */}
                  {onDeleteVideoClip && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteVideoClip(clip.id);
                      }}
                      className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 z-50"
                    >
                      <i className="ri-close-line text-xs text-white"></i>
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Text Track */}
        <div className="flex border-b border-gray-700">
          <div className="w-48 flex-shrink-0 p-2 border-r border-gray-700">
            <div className="flex flex-col gap-2">
              <button 
                onClick={onAddText}
                className="w-full h-8 bg-black rounded flex items-center justify-start gap-2 px-3 hover:bg-gray-900 transition-colors group"
              >
                <i className="ri-text text-sm text-[#38f47cf9] group-hover:text-white"></i>
                <span className="text-sm text-[#38f47cf9] group-hover:text-white">Add Text</span>
              </button>
            </div>
          </div>
          <div className="flex-1 p-2 overflow-x-auto" onClick={handleTrackClick}>
            <div className="flex gap-2 items-center min-h-[40px]">
              {textClips.map((clip, index) => (
                <div
                  key={clip.id}
                  className={`${
                    dragOverType === 'text' && dragOverIndex === index ? 'opacity-50' : ''
                  }`}
                  draggable
                  onDragStart={(e) => handleDragStart(e, clip.id, 'text', index)}
                  onDragOver={(e) => handleDragOver(e, 'text', index)}
                  onDrop={(e) => handleDrop(e, 'text', index)}
                  onDragEnd={handleDragEnd}
                >
                  <TextClip
                    clip={clip}
                    onEdit={onEditTextClip}
                    onDelete={onDeleteTextClip}
                    onResize={onResizeTextClip}
                    isActive={activeClip === clip.id}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sound Track */}
        <div className="flex">
          <div className="w-48 flex-shrink-0 p-2 border-r border-gray-700">
            <div className="flex flex-col gap-2">
              <button 
                onClick={onAddSound}
                className="w-full h-8 bg-black rounded flex items-center justify-start gap-2 px-3 hover:bg-gray-900 transition-colors group"
              >
                <i className="ri-music-line text-sm text-[#38f47cf9] group-hover:text-white"></i>
                <span className="text-sm text-[#38f47cf9] group-hover:text-white">Add Sound</span>
              </button>
            </div>
          </div>
          <div className="flex-1 p-2 overflow-x-auto" onClick={handleTrackClick}>
            <div className="flex gap-2 items-center min-h-[40px]">
              {soundClips.map((clip, index) => (
                <div
                  key={clip.id}
                  className={`${
                    dragOverType === 'sound' && dragOverIndex === index ? 'opacity-50' : ''
                  }`}
                  draggable
                  onDragStart={(e) => handleDragStart(e, clip.id, 'sound', index)}
                  onDragOver={(e) => handleDragOver(e, 'sound', index)}
                  onDrop={(e) => handleDrop(e, 'sound', index)}
                  onDragEnd={handleDragEnd}
                >
                  <SoundClip
                    clip={clip}
                    onEdit={onEditSoundClip}
                    onDelete={onDeleteSoundClip}
                    onResize={onResizeSoundClip}
                    isActive={activeClip === clip.id}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
        {/* 통합 플레이헤드 - 모든 트랙을 관통 */}
        <div
          ref={playheadRef}
          className="absolute top-0 bottom-0"
          style={{
            left: `calc(12rem + ${playheadPosition}px + 8px - 6px)`, // 12rem = w-48, 8px = padding, -6px = 드래그 영역 중앙
            zIndex: 50,
            width: '13px', // 드래그 가능한 영역 너비
            height: '100%',
            cursor: 'ew-resize'
          }}
          onMouseDown={handlePlayheadMouseDown}
        >
          {/* 실제 빨간 선 */}
          <div 
            className="absolute top-0 bottom-0 w-0.5 bg-red-500"
            style={{
              left: '50%',
              transform: 'translateX(-50%)',
              boxShadow: '0 0 6px rgba(239, 68, 68, 0.8)',
              pointerEvents: 'none'
            }}
          />
          {/* 플레이헤드 상단 삼각형 마커 */}
          <div className="absolute -top-2 left-1/2 transform -translate-x-1/2">
            <div className="w-0 h-0 border-l-[7px] border-l-transparent border-r-[7px] border-r-transparent border-t-[10px] border-t-red-500"></div>
          </div>
        </div>
      </div>
    </div>
  );
}