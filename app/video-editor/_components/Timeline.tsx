'use client';

import { useState, useEffect, useRef } from 'react';
import { VideoClip as VideoClipType, TextClip as TextClipType, SoundClip as SoundClipType } from '@/types/video-editor';
import { validateClipDuration, getTimelineEnd } from '../_utils/timeline-utils';
import TextClip from './TextClip';
import SoundClip from './SoundClip';
import TimelineControls from './TimelineControls';
import ContextMenu from './ContextMenu';


interface TimelineProps {
  clips: VideoClipType[];
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
  onDuplicateVideoClip?: (id: string) => void;
  onDuplicateTextClip?: (id: string) => void;
  onDuplicateSoundClip?: (id: string) => void;
  onSplitVideoClip?: (id: string) => void;
  onSplitTextClip?: (id: string) => void;
  onSplitSoundClip?: (id: string) => void;
  onResizeTextClip?: (id: string, newDuration: number) => void;
  onResizeSoundClip?: (id: string, newDuration: number) => void;
  onReorderVideoClips?: (clips: VideoClipType[]) => void;
  onUpdateVideoClipPosition?: (id: string, newPosition: number) => void;
  onUpdateTextClipPosition?: (id: string, newPosition: number) => void;
  onReorderTextClips?: (clips: TextClipType[]) => void;
  onReorderSoundClips?: (clips: SoundClipType[]) => void;
  onResizeVideoClip?: (id: string, newDuration: number) => void;
  onUpdateSoundClipPosition?: (id: string, newPosition: number) => void;
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
  onDuplicateVideoClip,
  onDuplicateTextClip,
  onDuplicateSoundClip,
  onSplitVideoClip,
  onSplitTextClip,
  onSplitSoundClip,
  onResizeTextClip,
  onResizeSoundClip,
  // onReorderVideoClips, // Commented out - not currently used
  onUpdateVideoClipPosition,
  onUpdateTextClipPosition,
  // onReorderTextClips, // Commented out - not currently used
  // onReorderSoundClips, // Commented out - not currently used
  onResizeVideoClip,
  onUpdateSoundClipPosition,
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
  const [activeClipType, setActiveClipType] = useState<'video' | 'text' | 'sound' | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragStartX, setDragStartX] = useState(0);
  const [startWidth, setStartWidth] = useState(0);
  const [resizeHandle, setResizeHandle] = useState<'left' | 'right' | null>(null);
  // const [draggedClip, setDraggedClip] = useState<{ id: string; type: 'video' | 'text' | 'sound'; index: number } | null>(null);
  const [dragOverIndex] = useState<number | null>(null);
  const [dragOverType] = useState<'video' | 'text' | 'sound' | null>(null);
  const playheadRef = useRef<HTMLDivElement>(null);
  const [isDraggingPlayhead, setIsDraggingPlayhead] = useState(false);
  const [dragDirection, setDragDirection] = useState<'left' | 'right'>('right');
  const [initialDragX, setInitialDragX] = useState(0);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; clipId: string; clipType: 'video' | 'text' | 'sound' } | null>(null);

  const handleMouseDown = (e: React.MouseEvent, clipId: string) => {
    if ((e.target as HTMLElement).classList.contains('resize-handle')) {
      return;
    }
    setIsDragging(true);
    setActiveClip(clipId);
    setInitialDragX(e.clientX);
    setDragStartX(e.clientX);
  };

  const handleContextMenu = (e: React.MouseEvent, clipId: string, clipType: 'video' | 'text' | 'sound') => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, clipId, clipType });
  };

  const getContextMenuItems = () => {
    if (!contextMenu) return [];

    const { clipId, clipType } = contextMenu;
    const playheadPosition = currentTime * pixelsPerSecond;
    
    let canSplit = false;
    if (clipType === 'video') {
      const clip = clips.find(c => c.id === clipId);
      if (clip) {
        canSplit = playheadPosition > clip.position && playheadPosition < clip.position + clip.duration;
      }
    } else if (clipType === 'text') {
      const clip = textClips.find(c => c.id === clipId);
      if (clip) {
        canSplit = playheadPosition > clip.position && playheadPosition < clip.position + clip.duration;
      }
    } else if (clipType === 'sound') {
      const clip = soundClips.find(c => c.id === clipId);
      if (clip) {
        canSplit = playheadPosition > clip.position && playheadPosition < clip.position + clip.duration;
      }
    }

    const items = [];

    // 수정 메뉴 (텍스트와 사운드 클립에만)
    if (clipType === 'text' && onEditTextClip) {
      const clip = textClips.find(c => c.id === clipId);
      if (clip) {
        items.push({
          label: '수정',
          icon: 'ri-edit-line',
          action: () => onEditTextClip(clip),
        });
      }
    } else if (clipType === 'sound' && onEditSoundClip) {
      const clip = soundClips.find(c => c.id === clipId);
      if (clip) {
        items.push({
          label: '수정',
          icon: 'ri-edit-line',
          action: () => onEditSoundClip(clip),
        });
      }
    }

    // 복제 메뉴
    if (clipType === 'video' && onDuplicateVideoClip) {
      items.push({
        label: '복제',
        icon: 'ri-file-copy-line',
        action: () => onDuplicateVideoClip(clipId),
      });
    } else if (clipType === 'text' && onDuplicateTextClip) {
      items.push({
        label: '복제',
        icon: 'ri-file-copy-line',
        action: () => onDuplicateTextClip(clipId),
      });
    } else if (clipType === 'sound' && onDuplicateSoundClip) {
      items.push({
        label: '복제',
        icon: 'ri-file-copy-line',
        action: () => onDuplicateSoundClip(clipId),
      });
    }

    // 분할 메뉴
    if (clipType === 'video' && onSplitVideoClip) {
      items.push({
        label: '분할',
        icon: 'ri-scissors-line',
        action: () => onSplitVideoClip(clipId),
        disabled: !canSplit,
      });
    } else if (clipType === 'text' && onSplitTextClip) {
      items.push({
        label: '분할',
        icon: 'ri-scissors-line',
        action: () => onSplitTextClip(clipId),
        disabled: !canSplit,
      });
    } else if (clipType === 'sound' && onSplitSoundClip) {
      items.push({
        label: '분할',
        icon: 'ri-scissors-line',
        action: () => onSplitSoundClip(clipId),
        disabled: !canSplit,
      });
    }

    // 삭제 메뉴
    if (clipType === 'video' && onDeleteVideoClip) {
      items.push({
        label: '삭제',
        icon: 'ri-delete-bin-line',
        action: () => onDeleteVideoClip(clipId),
      });
    } else if (clipType === 'text' && onDeleteTextClip) {
      items.push({
        label: '삭제',
        icon: 'ri-delete-bin-line',
        action: () => onDeleteTextClip(clipId),
      });
    } else if (clipType === 'sound' && onDeleteSoundClip) {
      items.push({
        label: '삭제',
        icon: 'ri-delete-bin-line',
        action: () => onDeleteSoundClip(clipId),
      });
    }

    return items;
  };

  // Drag and drop handlers - currently unused but preserved for future implementation
  // const handleDragStart = (e: React.DragEvent, id: string, type: 'video' | 'text' | 'sound', index: number) => {
  //   setDraggedClip({ id, type, index });
  //   e.dataTransfer.effectAllowed = 'move';
  // };

  // const handleDragOver = (e: React.DragEvent, type: 'video' | 'text' | 'sound', index: number) => {
  //   e.preventDefault();
  //   if (draggedClip && draggedClip.type === type) {
  //     setDragOverIndex(index);
  //     setDragOverType(type);
  //   }
  // };

  // const handleDragEnd = () => {
  //   setDraggedClip(null);
  //   setDragOverIndex(null);
  //   setDragOverType(null);
  // };

  // const handleDrop = (e: React.DragEvent, type: 'video' | 'text' | 'sound', dropIndex: number) => {
  //   e.preventDefault();
    
  //   if (!draggedClip || draggedClip.type !== type) return;
    
  //   if (type === 'video' && onReorderVideoClips) {
  //     const newClips = [...clips];
  //     const [movedClip] = newClips.splice(draggedClip.index, 1);
  //     newClips.splice(dropIndex, 0, movedClip);
  //     onReorderVideoClips(newClips);
  //   } else if (type === 'text' && onReorderTextClips) {
  //     const newClips = [...textClips];
  //     const [movedClip] = newClips.splice(draggedClip.index, 1);
  //     newClips.splice(dropIndex, 0, movedClip);
  //     onReorderTextClips(newClips);
  //   } else if (type === 'sound' && onReorderSoundClips) {
  //     const newClips = [...soundClips];
  //     const [movedClip] = newClips.splice(draggedClip.index, 1);
  //     newClips.splice(dropIndex, 0, movedClip);
  //     onReorderSoundClips(newClips);
  //   }
    
  //   handleDragEnd();
  // };

  const handleResizeStart = (e: React.MouseEvent, clipId: string, handle: 'left' | 'right', clipType: 'video' | 'text' | 'sound' = 'video') => {
    e.stopPropagation();
    e.preventDefault(); // 이벤트 전파 방지
    setIsResizing(true);
    setResizeHandle(handle);
    setActiveClip(clipId);
    setActiveClipType(clipType);
    setDragStartX(e.clientX);
    
    // 현재 클립의 duration 값을 가져와서 시작 width로 설정
    if (clipType === 'video') {
      const clip = clips.find(c => c.id === clipId);
      setStartWidth(clip?.duration || 200);
    } else if (clipType === 'text') {
      const clip = textClips.find(c => c.id === clipId);
      setStartWidth(clip?.duration || 200);
    } else if (clipType === 'sound') {
      const clip = soundClips.find(c => c.id === clipId);
      setStartWidth(clip?.duration || 200);
    }
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!activeClip) return;

      if (isResizing) {
        const delta = e.clientX - dragStartX;
        let newWidth;
        
        if (resizeHandle === 'left') {
          newWidth = Math.max(80, startWidth - delta);
        } else {
          newWidth = Math.max(80, startWidth + delta);
        }
        
        // Apply max duration limits for all clip types
        if (activeClipType === 'video') {
          const clipData = clips.find(c => c.id === activeClip);
          newWidth = validateClipDuration(newWidth, clipData?.maxDuration);
        } else if (activeClipType === 'text') {
          const clipData = textClips.find(c => c.id === activeClip);
          newWidth = validateClipDuration(newWidth, clipData?.maxDuration);
        } else if (activeClipType === 'sound') {
          const clipData = soundClips.find(c => c.id === activeClip);
          newWidth = validateClipDuration(newWidth, clipData?.maxDuration);
        }
        
        // DOM 업데이트: 모든 클립 타입에 대해 외부 wrapper의 width를 조절
        const clipElement = document.querySelector(`[data-clip-id="${activeClip}"]`) as HTMLElement;
        if (clipElement) {
          clipElement.style.width = `${newWidth}px`;
        }
      } else if (isDragging) {
        const delta = e.clientX - dragStartX;
        
        // Detect drag direction based on movement from initial position
        const totalDelta = e.clientX - initialDragX;
        const currentDirection = totalDelta >= 0 ? 'right' : 'left';
        setDragDirection(currentDirection);
        
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
          const delta = parseFloat(clipElement.style.transform.replace(/translateX\(|px\)/g, '')) || 0;
          
          // Import helper functions for timeline positioning
          import('../_utils/timeline-utils').then(({ snapToGrid, findNonOverlappingPositionWithDirection }) => {
            // Handle position update for all clip types
            if (activeClipType === 'video' && onUpdateVideoClipPosition) {
              const currentClip = clips.find(c => c.id === activeClip);
              if (currentClip) {
                const newPosition = currentClip.position + delta;
                const snappedPosition = snapToGrid(newPosition, pixelsPerSecond);
                
                // Check for overlaps and find best position based on drag direction
                const otherClips = clips.filter(c => c.id !== activeClip);
                const finalPosition = findNonOverlappingPositionWithDirection(
                  otherClips,
                  snappedPosition,
                  currentClip.duration,
                  dragDirection,
                  pixelsPerSecond
                );
                
                // Update the dragged clip position
                onUpdateVideoClipPosition(activeClip, finalPosition);
              }
            } else if (activeClipType === 'text' && onUpdateTextClipPosition) {
              const currentClip = textClips.find(c => c.id === activeClip);
              if (currentClip) {
                const newPosition = currentClip.position + delta;
                const snappedPosition = snapToGrid(newPosition, pixelsPerSecond);
                
                // Check for overlaps and find best position based on drag direction
                const otherClips = textClips.filter(c => c.id !== activeClip);
                const finalPosition = findNonOverlappingPositionWithDirection(
                  otherClips,
                  snappedPosition,
                  currentClip.duration,
                  dragDirection,
                  pixelsPerSecond
                );
                
                // Update the dragged clip position
                onUpdateTextClipPosition(activeClip, finalPosition);
              }
            } else if (activeClipType === 'sound' && onUpdateSoundClipPosition) {
              const currentClip = soundClips.find(c => c.id === activeClip);
              if (currentClip) {
                const newPosition = currentClip.position + delta;
                const snappedPosition = snapToGrid(newPosition, pixelsPerSecond);
                
                // Check for overlaps and find best position based on drag direction
                const otherClips = soundClips.filter(c => c.id !== activeClip);
                const finalPosition = findNonOverlappingPositionWithDirection(
                  otherClips,
                  snappedPosition,
                  currentClip.duration,
                  dragDirection,
                  pixelsPerSecond
                );
                
                // Update the dragged clip position
                onUpdateSoundClipPosition(activeClip, finalPosition);
              }
            }
          });
          clipElement.style.transform = '';
        }
        // 리사이징 종료 시, 실제 duration을 업데이트
        if (clipElement && isResizing) {
          const finalWidth = clipElement.offsetWidth;
          
          if (activeClipType === 'video' && onResizeVideoClip) {
            const clipData = clips.find(c => c.id === activeClip);
            const maxPx = clipData?.maxDuration ?? Infinity;
            const clampedWidth = Math.min(finalWidth, maxPx);
            onResizeVideoClip(activeClip, clampedWidth);
          } else if (activeClipType === 'text' && onResizeTextClip) {
            onResizeTextClip(activeClip, finalWidth);
          } else if (activeClipType === 'sound' && onResizeSoundClip) {
            const clipData = soundClips.find(c => c.id === activeClip);
            const maxPx = clipData?.maxDuration ?? Infinity;
            const clampedWidth = Math.min(finalWidth, maxPx);
            onResizeSoundClip(activeClip, clampedWidth);
          }
        }
      }
      setActiveClip(null);
      setActiveClipType(null);
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
  }, [activeClip, activeClipType, isDragging, isResizing, dragStartX, startWidth, resizeHandle, clips, textClips, soundClips, onResizeVideoClip, onResizeTextClip, onResizeSoundClip, onUpdateVideoClipPosition, onUpdateTextClipPosition, onUpdateSoundClipPosition, pixelsPerSecond, dragDirection, initialDragX]);

  // 타임라인 눈금: 1칸 = 1초, 30초까지 표시
  const timeMarkers = Array.from({ length: 31 }, (_, i) => {
    const minutes = Math.floor(i / 60);
    const seconds = i % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  });

  // 전체 길이 계산 (초 단위) - 모든 트랙의 최대 끝 지점 계산
  const videoEnd = getTimelineEnd(clips) / pixelsPerSecond;
  const textEnd = getTimelineEnd(textClips) / pixelsPerSecond;
  const soundEnd = getTimelineEnd(soundClips) / pixelsPerSecond;
  const totalDuration = Math.max(videoEnd, textEnd, soundEnd, 0);

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
    <div className="bg-gray-800 border-t border-gray-700 flex flex-col h-full">
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
      <div className="relative flex-1 overflow-y-auto overflow-x-hidden min-h-0 timeline-content">
        <div className="flex border-b border-gray-700">
          <div className="w-48 flex-shrink-0 p-1 border-r border-gray-700 flex items-center justify-center">
            <span className="text-[10px] text-gray-400 font-medium">Add a clip</span>
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
                      className="text-[10px] text-gray-400 inline-flex items-center"
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
          <div className="w-48 flex-shrink-0 p-1 border-r border-gray-700">
            <div className="flex flex-col gap-1">
              <button 
                onClick={onAddClip}
                className="w-full h-5 bg-black rounded flex items-center justify-start gap-1 px-2 hover:bg-gray-900 transition-colors group"
              >
                <i className="ri-add-line text-[10px] text-[#38f47cf9] group-hover:text-white"></i>
                <span className="text-[10px] text-[#38f47cf9] group-hover:text-white">Add Clip</span>
              </button>
            </div>
          </div>
          <div className="flex-1 p-1 overflow-x-auto">
            <div className="relative min-h-[24px]">
              {clips.map((clip, index) => (
                <div 
                  key={clip.id}
                  data-clip-id={clip.id}
                  className={`group absolute top-0 timeline-clip ${
                    dragOverType === 'video' && dragOverIndex === index ? 'opacity-50' : ''
                  }`}
                  style={{ 
                    width: `${clip.duration}px`,
                    left: `${clip.position}px`
                  }}
                  onMouseDown={(e) => {
                    if (!(e.target as HTMLElement).classList.contains('resize-handle')) {
                      setIsDragging(true);
                      setActiveClip(clip.id);
                      setActiveClipType('video');
                      setInitialDragX(e.clientX);
                      setDragStartX(e.clientX);
                    }
                  }}
                  onContextMenu={(e) => handleContextMenu(e, clip.id, 'video')}
                >
                  <div 
                    className="w-full h-5 bg-gradient-to-r from-gray-900 to-gray-800 rounded cursor-pointer hover:from-gray-800 hover:to-gray-700 transition-colors relative overflow-hidden border border-gray-700"
                    onMouseDown={(e) => handleMouseDown(e, clip.id)}
                  >
                    {/* 제목만 표시하는 막대 형태 */}
                    <div className="absolute inset-0 flex items-center">
                      <div className="px-2 py-0.5 text-[10px] font-medium text-white/90 truncate">
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
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Text Track */}
        <div className="flex border-b border-gray-700">
          <div className="w-48 flex-shrink-0 p-1 border-r border-gray-700">
            <div className="flex flex-col gap-1">
              <button 
                onClick={onAddText}
                className="w-full h-5 bg-black rounded flex items-center justify-start gap-1 px-2 hover:bg-gray-900 transition-colors group"
              >
                <i className="ri-text text-[10px] text-[#38f47cf9] group-hover:text-white"></i>
                <span className="text-[10px] text-[#38f47cf9] group-hover:text-white">Add Text</span>
              </button>
            </div>
          </div>
          <div className="flex-1 p-1 overflow-x-auto">
            <div className="relative min-h-[24px]">
              {textClips.map((clip, index) => (
                <div
                  key={clip.id}
                  data-clip-id={clip.id}
                  className={`timeline-clip absolute top-0 ${
                    dragOverType === 'text' && dragOverIndex === index ? 'opacity-50' : ''
                  }`}
                  style={{ 
                    width: `${clip.duration}px`,
                    left: `${clip.position}px`
                  }}
                  onMouseDown={(e) => {
                    if (!(e.target as HTMLElement).classList.contains('resize-handle')) {
                      setIsDragging(true);
                      setActiveClip(clip.id);
                      setActiveClipType('text');
                      setInitialDragX(e.clientX);
                      setDragStartX(e.clientX);
                    }
                  }}
                  onContextMenu={(e) => handleContextMenu(e, clip.id, 'text')}
                >
                  <TextClip
                    clip={clip}
                    onEdit={onEditTextClip}
                    onDelete={onDeleteTextClip}
                    onResize={onResizeTextClip}
                    onResizeStart={(e, handle) => handleResizeStart(e, clip.id, handle, 'text')}
                    isActive={activeClip === clip.id}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sound Track */}
        <div className="flex">
          <div className="w-48 flex-shrink-0 p-1 border-r border-gray-700">
            <div className="flex flex-col gap-1">
              <button 
                onClick={onAddSound}
                className="w-full h-5 bg-black rounded flex items-center justify-start gap-1 px-2 hover:bg-gray-900 transition-colors group"
              >
                <i className="ri-music-line text-[10px] text-[#38f47cf9] group-hover:text-white"></i>
                <span className="text-[10px] text-[#38f47cf9] group-hover:text-white">Add Sound</span>
              </button>
            </div>
          </div>
          <div className="flex-1 p-1 overflow-x-auto">
            <div className="relative min-h-[24px]">
              {soundClips.map((clip, index) => (
                <div
                  key={clip.id}
                  data-clip-id={clip.id}
                  className={`timeline-clip absolute top-0 ${
                    dragOverType === 'sound' && dragOverIndex === index ? 'opacity-50' : ''
                  }`}
                  style={{ 
                    width: `${clip.duration}px`,
                    left: `${clip.position}px`
                  }}
                  onMouseDown={(e) => {
                    if (!(e.target as HTMLElement).classList.contains('resize-handle')) {
                      setIsDragging(true);
                      setActiveClip(clip.id);
                      setActiveClipType('sound');
                      setInitialDragX(e.clientX);
                      setDragStartX(e.clientX);
                    }
                  }}
                  onContextMenu={(e) => handleContextMenu(e, clip.id, 'sound')}
                >
                  <SoundClip
                    clip={clip}
                    onEdit={onEditSoundClip}
                    onDelete={onDeleteSoundClip}
                    onResize={onResizeSoundClip}
                    onResizeStart={(e, handle) => handleResizeStart(e, clip.id, handle, 'sound')}
                    isActive={activeClip === clip.id}
                    pixelsPerSecond={pixelsPerSecond}
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

      {/* Context Menu */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={getContextMenuItems()}
          onClose={() => setContextMenu(null)}
        />
      )}
    </div>
  );
}