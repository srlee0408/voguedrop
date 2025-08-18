'use client';

import { useEffect, useRef } from 'react';
import { VideoClip as VideoClipType, TextClip as TextClipType, SoundClip as SoundClipType } from '@/types/video-editor';
import TimelineControls from './TimelineControls';
import TimelineTrack from './TimelineTrack';
import TimelinePlayhead from './TimelinePlayhead';
import TimelineSelectionBox from './TimelineSelectionBox';
import { useTimelineState } from '../_hooks/useTimelineState';
import { useDragAndDrop } from '../_hooks/useDragAndDrop';
import { useSelectionState } from '../_hooks/useSelectionState';
import { calculateTimelineDuration, generateTimeMarkers } from '../_utils/timeline-helpers';

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
  onResizeSoundClip?: (id: string, newDuration: number, handle?: 'left' | 'right', deltaPosition?: number) => void;
  onReorderVideoClips?: (clips: VideoClipType[]) => void;
  onUpdateVideoClipPosition?: (id: string, newPosition: number) => void;
  onUpdateTextClipPosition?: (id: string, newPosition: number) => void;
  onReorderTextClips?: (clips: TextClipType[]) => void;
  onReorderSoundClips?: (clips: SoundClipType[]) => void;
  onResizeVideoClip?: (id: string, newDuration: number, handle?: 'left' | 'right', deltaPosition?: number) => void;
  onUpdateSoundClipPosition?: (id: string, newPosition: number) => void;
  onUpdateAllVideoClips?: (clips: VideoClipType[]) => void;
  onUpdateAllTextClips?: (clips: TextClipType[]) => void;
  onUpdateAllSoundClips?: (clips: SoundClipType[]) => void;
  onUpdateSoundVolume?: (id: string, volume: number) => void;
  onUpdateSoundFade?: (id: string, fadeType: 'fadeIn' | 'fadeOut', duration: number) => void;
  pixelsPerSecond?: number;
  currentTime?: number;
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
  onUpdateVideoClipPosition,
  onUpdateTextClipPosition,
  onResizeVideoClip,
  onUpdateSoundClipPosition,
  onUpdateAllVideoClips,
  onUpdateAllTextClips,
  onUpdateAllSoundClips,
  onUpdateSoundVolume,
  onUpdateSoundFade,
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
  // Use custom hooks for state management
  const {
    activeClip,
    activeClipType,
    selectedClip,
    selectedClipType,
    rectSelectedClips,
    setActiveClipInfo,
    selectClip,
    clearSelection,
    setRectSelectedClips,
  } = useTimelineState();

  const {
    isDragging,
    dragStartX,
    isResizing,
    resizeHandle,
    startWidth,
    startPosition,
    resizeMoved,
    finalResizeWidth,
    finalResizePosition,
    isDraggingPlayhead,
    setIsDraggingPlayhead,
    startDrag,
    startResize,
    resetDragState,
    updateDragDirection,
    checkResizeActivation,
    setFinalResizeWidth,
    setFinalResizePosition,
  } = useDragAndDrop();

  const {
    selectionContainerRef,
    isSelectingRange,
    selectionStartX,
    selectionCurrentX,
    selectionStartY,
    selectionCurrentY,
    isRangeActive,
    selectionRangeStartX,
    selectionRangeEndX,
    selectionRangeStartY,
    selectionRangeEndY,
    isAdjustingSelection,
    isMovingSelection,
    startSelection,
    updateSelection,
    endSelection,
    startAdjustSelection,
    startMoveSelection,
    getSelectionBounds,
  } = useSelectionState();

  const playheadRef = useRef<HTMLDivElement>(null);

  // Calculate timeline duration
  const totalDuration = calculateTimelineDuration(clips, textClips, soundClips, pixelsPerSecond);
  const minimumDuration = 60;
  const bufferTime = 10;
  const timelineLength = Math.max(minimumDuration, Math.ceil(totalDuration + bufferTime));
  const timeMarkers = generateTimeMarkers(timelineLength);
  const playheadPosition = currentTime * pixelsPerSecond;

  // Update rect selected clips based on selection area
  const updateRectSelectedClips = (left: number, right: number, top: number, bottom: number) => {
    const container = selectionContainerRef.current;
    if (!container) return;
    const containerRect = container.getBoundingClientRect();
    const elements = container.querySelectorAll<HTMLElement>('.timeline-clip');
    const intersecting: { id: string; type: 'video' | 'text' | 'sound' }[] = [];
    
    elements.forEach((el) => {
      const elRect = el.getBoundingClientRect();
      const elLeft = elRect.left - containerRect.left;
      const elRight = elRect.right - containerRect.left;
      const elTop = elRect.top - containerRect.top;
      const elBottom = elRect.bottom - containerRect.top;
      const overlap = elLeft < right && elRight > left && elTop < bottom && elBottom > top;
      
      if (overlap) {
        const id = el.getAttribute('data-clip-id') || '';
        const typeAttr = el.getAttribute('data-clip-type');
        if (id && (typeAttr === 'video' || typeAttr === 'text' || typeAttr === 'sound')) {
          intersecting.push({ id, type: typeAttr as 'video' | 'text' | 'sound' });
        }
      }
    });
    
    setRectSelectedClips(intersecting);
  };

  // Handle mouse down on clip
  const handleMouseDown = (e: React.MouseEvent, clipId: string, clipType: 'video' | 'text' | 'sound') => {
    if (e.shiftKey || isSelectingRange || isAdjustingSelection || isMovingSelection) {
      return;
    }
    if ((e.target as HTMLElement).classList.contains('resize-handle')) {
      return;
    }
    
    startDrag(e.clientX);
    setActiveClipInfo(clipId, clipType);
    selectClip(clipId, clipType);
  };

  // Handle resize start
  const handleResizeStart = (e: React.MouseEvent, clipId: string, handle: 'left' | 'right', clipType: 'video' | 'text' | 'sound' = 'video') => {
    if (e.shiftKey || isSelectingRange || isAdjustingSelection || isMovingSelection) {
      e.stopPropagation();
      e.preventDefault();
      return;
    }
    
    e.stopPropagation();
    e.preventDefault();
    
    let currentWidth = 200;
    let currentPosition = 0;
    
    if (clipType === 'video') {
      const clip = clips.find(c => c.id === clipId);
      currentWidth = clip?.duration || 200;
      currentPosition = clip?.position || 0;
    } else if (clipType === 'text') {
      const clip = textClips.find(c => c.id === clipId);
      currentWidth = clip?.duration || 200;
      currentPosition = clip?.position || 0;
    } else if (clipType === 'sound') {
      const clip = soundClips.find(c => c.id === clipId);
      currentWidth = clip?.duration || 200;
      currentPosition = clip?.position || 0;
    }
    
    startResize(e.clientX, handle, currentWidth, currentPosition);
    setActiveClipInfo(clipId, clipType);
  };

  // Handle toolbar action
  const handleToolbarAction = (action: 'edit' | 'duplicate' | 'split' | 'delete') => {
    if (action === 'delete') {
      if (rectSelectedClips.length > 0) {
        rectSelectedClips.forEach(({ id, type }) => {
          if (type === 'video' && onDeleteVideoClip) onDeleteVideoClip(id);
          if (type === 'text' && onDeleteTextClip) onDeleteTextClip(id);
          if (type === 'sound' && onDeleteSoundClip) onDeleteSoundClip(id);
        });
        setRectSelectedClips([]);
        clearSelection();
        return;
      }
    }

    if (!selectedClip || !selectedClipType) return;

    switch (action) {
      case 'edit':
        if (selectedClipType === 'text' && onEditTextClip) {
          const clip = textClips.find(c => c.id === selectedClip);
          if (clip) onEditTextClip(clip);
        } else if (selectedClipType === 'sound' && onEditSoundClip) {
          const clip = soundClips.find(c => c.id === selectedClip);
          if (clip) onEditSoundClip(clip);
        }
        break;

      case 'duplicate':
        if (selectedClipType === 'video' && onDuplicateVideoClip) {
          onDuplicateVideoClip(selectedClip);
        } else if (selectedClipType === 'text' && onDuplicateTextClip) {
          onDuplicateTextClip(selectedClip);
        } else if (selectedClipType === 'sound' && onDuplicateSoundClip) {
          onDuplicateSoundClip(selectedClip);
        }
        break;

      case 'split':
        if (selectedClipType === 'video' && onSplitVideoClip) {
          onSplitVideoClip(selectedClip);
        } else if (selectedClipType === 'text' && onSplitTextClip) {
          onSplitTextClip(selectedClip);
        } else if (selectedClipType === 'sound' && onSplitSoundClip) {
          onSplitSoundClip(selectedClip);
        }
        break;

      case 'delete':
        if (selectedClipType === 'video' && onDeleteVideoClip) {
          onDeleteVideoClip(selectedClip);
        } else if (selectedClipType === 'text' && onDeleteTextClip) {
          onDeleteTextClip(selectedClip);
        } else if (selectedClipType === 'sound' && onDeleteSoundClip) {
          onDeleteSoundClip(selectedClip);
        }
        clearSelection();
        break;
    }
  };

  // Check if split is possible
  const canSplit = () => {
    if (!selectedClip || !selectedClipType) return false;
    const playheadPos = currentTime * pixelsPerSecond;
    
    if (selectedClipType === 'video') {
      const clip = clips.find(c => c.id === selectedClip);
      if (clip) {
        return playheadPos > clip.position && playheadPos < clip.position + clip.duration;
      }
    } else if (selectedClipType === 'text') {
      const clip = textClips.find(c => c.id === selectedClip);
      if (clip) {
        return playheadPos > clip.position && playheadPos < clip.position + clip.duration;
      }
    } else if (selectedClipType === 'sound') {
      const clip = soundClips.find(c => c.id === selectedClip);
      if (clip) {
        return playheadPos > clip.position && playheadPos < clip.position + clip.duration;
      }
    }
    
    return false;
  };

  // Handle timeline click for seeking
  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.shiftKey || isSelectingRange || isAdjustingSelection || isMovingSelection) return;
    if (!onSeek || isResizing || isDragging) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const time = Math.max(0, Math.min(x / pixelsPerSecond, totalDuration));
    onSeek(time);
  };

  // Handle track click for seeking
  const handleTrackClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('.timeline-clip')) return;
    if (e.shiftKey || isSelectingRange || isAdjustingSelection || isMovingSelection) return;
    if (!onSeek || isResizing || isDragging) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const time = Math.max(0, Math.min(x / pixelsPerSecond, totalDuration));
    onSeek(time);
  };

  // Handle playhead drag
  const handlePlayheadMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    if (e.shiftKey || isSelectingRange || isAdjustingSelection || isMovingSelection) return;
    setIsDraggingPlayhead(true);
  };

  // Handle selection mouse down
  const handleSelectionMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isDragging || isResizing || isAdjustingSelection || isMovingSelection) return;
    const target = e.target as HTMLElement;
    if (target.closest('.timeline-clip')) return;
    if (target.closest('.resize-handle')) return;
    if (playheadRef.current && playheadRef.current.contains(target)) return;

    const container = selectionContainerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    if (y <= 32) return; // Timeline header protection

    e.preventDefault();
    e.stopPropagation();

    const clampedX = Math.max(0, Math.min(x, rect.width));
    const clampedY = Math.max(0, Math.min(y, rect.height));
    
    clearSelection();
    startSelection(clampedX, clampedY);
  };

  // Mouse move and mouse up effects
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!activeClip) return;

      if (isResizing) {
        const delta = e.clientX - dragStartX;
        const activated = checkResizeActivation(e.clientX);
        
        if (!activated) return;

        let newWidth = startWidth;
        let newPosition = startPosition;

        // Calculate new dimensions based on resize handle

        if (resizeHandle === 'left') {
          newPosition = Math.max(0, startPosition + delta);
          newWidth = startWidth + (startPosition - newPosition);
        } else {
          newWidth = startWidth + delta;
        }

        // Apply constraints
        newWidth = Math.max(80, newWidth);
        newPosition = Math.max(0, newPosition);

        setFinalResizeWidth(newWidth);
        setFinalResizePosition(newPosition);

        // Update DOM
        const clipElement = document.querySelector(`[data-clip-id="${activeClip}"]`) as HTMLElement;
        if (clipElement) {
          clipElement.style.width = `${newWidth}px`;
          if (resizeHandle === 'left') {
            clipElement.style.left = `${newPosition}px`;
          }
        }
      } else if (isDragging) {
        const delta = e.clientX - dragStartX;
        updateDragDirection(e.clientX);
        
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
          import('../_utils/timeline-utils').then(({ magneticPositioning, freePositioning, soundPositioning }) => {
            if (activeClipType === 'video' && onUpdateAllVideoClips) {
              const currentClip = clips.find(c => c.id === activeClip);
              if (currentClip) {
                const newPosition = Math.max(0, currentClip.position + delta);
                const { targetPosition, adjustedClips } = magneticPositioning(
                  clips,
                  activeClip,
                  newPosition,
                  currentClip.duration
                );
                
                const updatedClips = [
                  ...adjustedClips,
                  { ...currentClip, position: targetPosition }
                ].sort((a, b) => a.position - b.position);
                
                onUpdateAllVideoClips(updatedClips);
              }
            } else if (activeClipType === 'text' && onUpdateAllTextClips) {
              const currentClip = textClips.find(c => c.id === activeClip);
              if (currentClip) {
                const newPosition = Math.max(0, currentClip.position + delta);
                const targetPosition = freePositioning(
                  textClips,
                  activeClip,
                  newPosition,
                  currentClip.duration
                );
                
                const updatedClips = textClips.map(clip =>
                  clip.id === activeClip ? { ...clip, position: targetPosition } : clip
                ).sort((a, b) => a.position - b.position);
                
                onUpdateAllTextClips(updatedClips);
              }
            } else if (activeClipType === 'sound' && onUpdateAllSoundClips) {
              const currentClip = soundClips.find(c => c.id === activeClip);
              if (currentClip) {
                const newPosition = Math.max(0, currentClip.position + delta);
                const { targetPosition, adjustedClips } = soundPositioning(
                  soundClips,
                  activeClip,
                  newPosition,
                  currentClip.duration
                );
                
                const updatedClips = [
                  ...adjustedClips,
                  { ...currentClip, position: targetPosition }
                ].sort((a, b) => a.position - b.position);
                
                onUpdateAllSoundClips(updatedClips);
              }
            }
          });
          clipElement.style.transform = '';
        }
        
        // Handle resize end
        if (clipElement && isResizing && resizeMoved) {
          const finalWidth = finalResizeWidth || startWidth;
          const finalPosition = resizeHandle === 'left' ? finalResizePosition : startPosition;
          
          if (activeClipType === 'video') {
            if (resizeHandle === 'left' && onUpdateVideoClipPosition) {
              onUpdateVideoClipPosition(activeClip, finalPosition);
            }
            if (onResizeVideoClip) {
              const deltaPosition = resizeHandle === 'left' ? finalPosition - startPosition : 0;
              onResizeVideoClip(activeClip, finalWidth, resizeHandle || undefined, deltaPosition);
            }
          } else if (activeClipType === 'text') {
            if (resizeHandle === 'left' && onUpdateTextClipPosition) {
              onUpdateTextClipPosition(activeClip, finalPosition);
            }
            if (onResizeTextClip) {
              onResizeTextClip(activeClip, finalWidth);
            }
          } else if (activeClipType === 'sound') {
            if (resizeHandle === 'left' && onUpdateSoundClipPosition) {
              onUpdateSoundClipPosition(activeClip, finalPosition);
            }
            if (onResizeSoundClip) {
              const deltaPosition = resizeHandle === 'left' ? finalPosition - startPosition : 0;
              onResizeSoundClip(activeClip, finalWidth, resizeHandle || undefined, deltaPosition);
            }
          }
        }
      }
      
      setActiveClipInfo(null, null);
      resetDragState();
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeClip, activeClipType, isDragging, isResizing, dragStartX, startWidth, startPosition, resizeHandle, clips, textClips, soundClips, resizeMoved, finalResizeWidth, finalResizePosition]);

  // Selection range effect
  useEffect(() => {
    if (!isSelectingRange) return;

    const handleMove = (e: MouseEvent) => {
      const container = selectionContainerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const clampedX = Math.max(0, Math.min(x, rect.width));
      const clampedY = Math.max(0, Math.min(y, rect.height));
      
      updateSelection(clampedX, clampedY);
      
      const left = Math.min(selectionStartX ?? 0, clampedX);
      const right = Math.max(selectionStartX ?? 0, clampedX);
      const top = Math.min(selectionStartY ?? 0, clampedY);
      const bottom = Math.max(selectionStartY ?? 0, clampedY);
      updateRectSelectedClips(left, right, top, bottom);
    };

    const handleUp = () => {
      if (selectionStartX === null || selectionCurrentX === null || 
          selectionStartY === null || selectionCurrentY === null) {
        endSelection();
        return;
      }

      const start = Math.min(selectionStartX, selectionCurrentX);
      const end = Math.max(selectionStartX, selectionCurrentX);
      const top = Math.min(selectionStartY, selectionCurrentY);
      const bottom = Math.max(selectionStartY, selectionCurrentY);
      const minDragPx = 5;
      
      if (end - start < minDragPx || bottom - top < 1) {
        setRectSelectedClips([]);
      }
      
      endSelection();
    };

    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', handleUp);
    
    return () => {
      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('mouseup', handleUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSelectingRange, selectionStartX, selectionCurrentX, selectionStartY, selectionCurrentY]);

  // Playhead drag effect
  useEffect(() => {
    const handlePlayheadMouseMove = (e: MouseEvent) => {
      if (!isDraggingPlayhead || !onSeek) return;
      
      const scrollContainer = document.querySelector('.timeline-content .overflow-x-auto');
      if (!scrollContainer) return;
      
      const rect = scrollContainer.getBoundingClientRect();
      const scrollLeft = scrollContainer.scrollLeft;
      const x = e.clientX - rect.left - 192 + scrollLeft;
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDraggingPlayhead, onSeek, pixelsPerSecond, totalDuration]);

  // Get selection bounds for rendering
  const selectionBounds = getSelectionBounds();

  return (
    <div className="bg-gray-800 border-t border-gray-700 flex flex-col h-full">
      {/* Playback controls */}
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

      <div className="relative flex-1 overflow-y-auto min-h-0 timeline-content">
        {/* Actions toolbar */}
        <div className="flex border-b border-gray-700 bg-gray-900">
          <div className="w-48 flex-shrink-0 p-1 border-r border-gray-700 flex items-center justify-center">
            <span className="text-[10px] text-gray-400 font-medium">Actions</span>
          </div>
          <div className="flex-1 p-1 flex items-center gap-2 px-3">
            <button
              onClick={() => handleToolbarAction('edit')}
              disabled={!selectedClip || (selectedClipType !== 'text' && selectedClipType !== 'sound')}
              className={`px-3 py-1 rounded text-xs flex items-center gap-1.5 transition-colors ${
                selectedClip && (selectedClipType === 'text' || selectedClipType === 'sound')
                  ? 'bg-gray-800 hover:bg-gray-700 text-white'
                  : 'bg-gray-900 text-gray-500 cursor-not-allowed'
              }`}
            >
              <i className="ri-edit-line text-[11px]"></i>
              <span>Edit</span>
            </button>
            
            <button
              onClick={() => handleToolbarAction('duplicate')}
              disabled={!selectedClip}
              className={`px-3 py-1 rounded text-xs flex items-center gap-1.5 transition-colors ${
                selectedClip
                  ? 'bg-gray-800 hover:bg-gray-700 text-white'
                  : 'bg-gray-900 text-gray-500 cursor-not-allowed'
              }`}
            >
              <i className="ri-file-copy-line text-[11px]"></i>
              <span>Duplicate</span>
            </button>
            
            <button
              onClick={() => handleToolbarAction('split')}
              disabled={!selectedClip || !canSplit()}
              className={`px-3 py-1 rounded text-xs flex items-center gap-1.5 transition-colors ${
                selectedClip && canSplit() 
                  ? 'bg-gray-800 hover:bg-gray-700 text-white' 
                  : 'bg-gray-900 text-gray-500 cursor-not-allowed'
              }`}
            >
              <i className="ri-scissors-line text-[11px]"></i>
              <span>Split</span>
            </button>
            
            <button
              onClick={() => handleToolbarAction('delete')}
              disabled={!selectedClip && rectSelectedClips.length === 0}
              className={`px-3 py-1 rounded text-xs flex items-center gap-1.5 transition-colors ${
                selectedClip || rectSelectedClips.length > 0
                  ? 'bg-red-900/50 hover:bg-red-800/50 text-red-400 hover:text-red-300'
                  : 'bg-gray-900 text-gray-500 cursor-not-allowed'
              }`}
            >
              <i className="ri-delete-bin-line text-[11px]"></i>
              <span>
                {rectSelectedClips.length > 0 ? `Delete (${rectSelectedClips.length})` : 'Delete'}
              </span>
            </button>
            
            <div className="ml-auto text-[10px] text-gray-400">
              {rectSelectedClips.length > 0 ? (
                `${rectSelectedClips.length} selected`
              ) : selectedClip ? (
                `${selectedClipType === 'video' ? 'Video' : selectedClipType === 'text' ? 'Text' : 'Sound'} clip selected`
              ) : (
                'Select a clip or drag to multi-select'
              )}
            </div>
          </div>
        </div>
        
        {/* Timeline content */}
        <div className="flex overflow-x-auto">
          {/* Left fixed area */}
          <div className="flex-shrink-0 w-48">
            <div className="border-b border-r border-gray-700 p-1 h-8 flex items-center justify-center">
              <span className="text-[10px] text-gray-400 font-medium">Timeline</span>
            </div>
        
            <div className="border-b border-r border-gray-700 h-8 flex items-center justify-center px-2">
              <button 
                onClick={onAddClip}
                className="w-32 h-6 bg-black rounded flex items-center justify-center gap-1.5 hover:bg-gray-900 transition-colors group"
              >
                <i className="ri-add-line text-[13px] text-[#38f47cf9] group-hover:text-white"></i>
                <span className="text-[13px] text-[#38f47cf9] group-hover:text-white">Add Clip</span>
              </button>
            </div>
            
            <div className="border-b border-r border-gray-700 h-8 flex items-center justify-center px-2">
              <button 
                onClick={onAddText}
                className="w-32 h-6 bg-black rounded flex items-center justify-center gap-1.5 hover:bg-gray-900 transition-colors group"
              >
                <i className="ri-text text-[13px] text-[#38f47cf9] group-hover:text-white"></i>
                <span className="text-[13px] text-[#38f47cf9] group-hover:text-white">Add Text</span>
              </button>
            </div>

            <div className="border-r border-gray-700 h-8 flex items-center justify-center px-2">
              <button 
                onClick={onAddSound}
                className="w-32 h-6 bg-black rounded flex items-center justify-center gap-1.5 hover:bg-gray-900 transition-colors group"
              >
                <i className="ri-music-line text-[13px] text-[#38f47cf9] group-hover:text-white"></i>
                <span className="text-[13px] text-[#38f47cf9] group-hover:text-white">Add Sound</span>
              </button>
            </div>
          </div>

          {/* Right scrollable area */}
          <div
            className="flex-1 relative"
            style={{ minWidth: `${timelineLength * pixelsPerSecond}px` }}
            ref={selectionContainerRef}
            onMouseDownCapture={handleSelectionMouseDown}
          >
            {/* Timeline ruler */}
            <div className="border-b border-gray-700 bg-black h-8">
              <div 
                className="flex items-center h-full relative"
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

            {/* Video track */}
            <TimelineTrack
              type="video"
              clips={clips}
              selectedClips={selectedClip === null ? [] : [selectedClip]}
              rectSelectedClips={rectSelectedClips}
              onClipClick={selectClip}
              onMouseDown={handleMouseDown}
              onResizeStart={handleResizeStart}
              activeClip={activeClip}
              pixelsPerSecond={pixelsPerSecond}
              isSelectingRange={isSelectingRange}
              onTrackClick={handleTrackClick}
            />

            {/* Text track */}
            <TimelineTrack
              type="text"
              clips={textClips}
              selectedClips={selectedClip === null ? [] : [selectedClip]}
              rectSelectedClips={rectSelectedClips}
              onClipClick={selectClip}
              onMouseDown={handleMouseDown}
              onResizeStart={handleResizeStart}
              onEditClip={onEditTextClip as ((clip: TextClipType | SoundClipType) => void) | undefined}
              onDeleteClip={onDeleteTextClip}
              activeClip={activeClip}
              pixelsPerSecond={pixelsPerSecond}
              isSelectingRange={isSelectingRange}
              onTrackClick={handleTrackClick}
            />

            {/* Sound track */}
            <TimelineTrack
              type="sound"
              clips={soundClips}
              selectedClips={selectedClip === null ? [] : [selectedClip]}
              rectSelectedClips={rectSelectedClips}
              onClipClick={selectClip}
              onMouseDown={handleMouseDown}
              onResizeStart={handleResizeStart}
              onEditClip={onEditSoundClip as ((clip: TextClipType | SoundClipType) => void) | undefined}
              onDeleteClip={onDeleteSoundClip}
              onVolumeChange={onUpdateSoundVolume}
              onFadeChange={onUpdateSoundFade}
              activeClip={activeClip}
              pixelsPerSecond={pixelsPerSecond}
              isSelectingRange={isSelectingRange}
              onTrackClick={handleTrackClick}
            />

            {/* Selection box */}
            {isSelectingRange && selectionBounds && (
              <TimelineSelectionBox
                left={selectionBounds.left}
                top={selectionBounds.top}
                width={selectionBounds.width}
                height={selectionBounds.height}
                isActive={false}
              />
            )}

            {/* Active selection box */}
            {isRangeActive && selectionRangeStartX !== null && selectionRangeEndX !== null && 
             selectionRangeStartY !== null && selectionRangeEndY !== null && (
              <TimelineSelectionBox
                left={Math.min(selectionRangeStartX, selectionRangeEndX)}
                top={Math.min(selectionRangeStartY, selectionRangeEndY)}
                width={Math.abs(selectionRangeEndX - selectionRangeStartX)}
                height={Math.abs(selectionRangeEndY - selectionRangeStartY)}
                isActive={true}
                onMouseDown={startMoveSelection}
                onResizeStart={startAdjustSelection}
              />
            )}

            {/* Playhead */}
            <TimelinePlayhead
              position={playheadPosition}
              onMouseDown={handlePlayheadMouseDown}
            />
          </div>
        </div>
      </div>
    </div>
  );
}