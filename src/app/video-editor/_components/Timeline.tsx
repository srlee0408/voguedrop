'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { VideoClip as VideoClipType, TextClip as TextClipType, SoundClip as SoundClipType } from '@/shared/types/video-editor';
import TimelineControls from './TimelineControls';
import TimelineTrack from './TimelineTrack';
import TimelinePlayhead from './TimelinePlayhead';
import TimelineSelectionBox from './TimelineSelectionBox';
import TimelineGrid from './TimelineGrid';
import { useDragAndDrop } from '../_hooks/useDragAndDrop';
import { useSelectionState } from '../_hooks/useSelectionState';
import { useClips } from '../_context/Providers';
import { calculateTimelineDuration, generateTimeMarkers } from '../_utils/timeline-helpers';
import { getClipsForLane, canAddNewLane, getTextClipsForLane, canAddNewTextLane, getVideoClipsForLane, canAddNewVideoLane } from '../_utils/lane-arrangement';

interface TimelineProps {
  clips: VideoClipType[];
  textClips?: TextClipType[];
  soundClips?: SoundClipType[];
  soundLanes?: number[]; // Active sound lane indices
  textLanes?: number[]; // Active text lane indices
  videoLanes?: number[]; // Active video lane indices
  onAddClip: () => void;
  onAddText?: () => void;
  onAddSound?: () => void;
  onAddSoundLane?: () => void; // Add new sound lane
  onDeleteSoundLane?: (laneIndex: number) => void; // Delete sound lane
  onAddSoundToLane?: (laneIndex: number) => void; // Add sound to specific lane
  onAddTextLane?: () => void; // Add new text lane
  onDeleteTextLane?: (laneIndex: number) => void; // Delete text lane
  onAddTextToLane?: (laneIndex: number) => void; // Add text to specific lane
  onAddVideoLane?: () => void; // Add new video lane
  onDeleteVideoLane?: (laneIndex: number) => void; // Delete video lane
  onAddVideoToLane?: (laneIndex: number) => void; // Add video to specific lane
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
  onUpdateSoundClipLane?: (id: string, laneIndex: number) => void; // 사운드 클립 레인 변경
  onUpdateTextClipLane?: (id: string, laneIndex: number) => void; // 텍스트 클립 레인 변경
  onUpdateVideoClipLane?: (id: string, laneIndex: number) => void; // 비디오 클립 레인 변경
  pixelsPerSecond?: number;
  currentTime?: number;
  totalDuration?: number;
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
  soundLanes = [0], // Default to single lane
  textLanes = [0], // Default to single text lane
  videoLanes = [0], // Default to single video lane
  onAddClip, // eslint-disable-line @typescript-eslint/no-unused-vars
  onAddText, // eslint-disable-line @typescript-eslint/no-unused-vars
  onAddSound, // eslint-disable-line @typescript-eslint/no-unused-vars
  onAddSoundLane,
  onDeleteSoundLane,
  onAddSoundToLane,
  onAddTextLane,
  onDeleteTextLane,
  onAddTextToLane,
  onAddVideoLane,
  onDeleteVideoLane,
  onAddVideoToLane,
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
  onUpdateTextClipLane, // eslint-disable-line @typescript-eslint/no-unused-vars
  onUpdateVideoClipLane, // eslint-disable-line @typescript-eslint/no-unused-vars
  pixelsPerSecond: initialPixelsPerSecond = 40,
  currentTime = 0,
  totalDuration: propTotalDuration,
  isPlaying = false,
  onSeek,
  onPlayPause,
  onUndo,
  onRedo,
  canUndo = false,
  canRedo = false,
}: TimelineProps) {
  // 줌 레벨 상태 관리
  const [pixelsPerSecond, setPixelsPerSecond] = useState(initialPixelsPerSecond);
  // Use Context for selection state management
  const {
    selectedClipId,
    selectedClipType,
    multiSelectedClips,
    handleSelectClip,
    handleClearSelection,
    handleSetMultiSelectedClips,
  } = useClips();
  
  // Local state for drag/resize operations
  const [activeClip, setActiveClip] = useState<string | null>(null);
  const [activeClipType, setActiveClipType] = useState<'video' | 'text' | 'sound' | null>(null);
  
  // State for tracking drag target lane for all clip types
  const [dragTargetLane, setDragTargetLane] = useState<{ laneIndex: number, laneType: 'video' | 'text' | 'sound' } | null>(null);
  
  // Convert multi-selection to legacy format for compatibility
  const rectSelectedClips = multiSelectedClips;
  const selectedClip = selectedClipId;
  
  // Helper functions
  const selectClip = (clipId: string, clipType: 'video' | 'text' | 'sound') => {
    handleSelectClip(clipId, clipType);
  };
  
  const clearSelection = () => {
    handleClearSelection();
  };
  
  const setActiveClipInfo = (clipId: string | null, clipType: 'video' | 'text' | 'sound' | null) => {
    setActiveClip(clipId);
    setActiveClipType(clipType);
  };
  
  const setRectSelectedClips = (clips: Array<{id: string, type: 'video' | 'text' | 'sound'}>) => {
    // 드래그 선택 결과를 Context의 multiSelectedClips에 업데이트
    handleSetMultiSelectedClips(clips);
  };

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

  // 줌 변경 핸들러
  const handleZoomChange = (direction: 'in' | 'out') => {
    setPixelsPerSecond(prev => {
      const basePixelsPerSecond = 40; // 기본값 (100%)
      const currentPercent = (prev / basePixelsPerSecond) * 100;
      const zoomStep = 10; // 10% 단위로 조절
      const minPercent = 50;  // 최소 50% (축소 제한)
      const maxPercent = 200; // 최대 200% (확대 제한)
      
      let newPercent: number;
      if (direction === 'in') {
        // 줌 인 (확대) - 10% 증가
        newPercent = Math.min(maxPercent, currentPercent + zoomStep);
      } else {
        // 줌 아웃 (축소) - 10% 감소
        newPercent = Math.max(minPercent, currentPercent - zoomStep);
      }
      
      // 퍼센트를 픽셀로 변환
      return Math.round((newPercent / 100) * basePixelsPerSecond);
    });
  };

  // Helper function to check if click is near playhead
  const isNearPlayhead = useCallback((clientX: number): boolean => {
    const scrollContainer = document.querySelector('.timeline-content .overflow-x-auto');
    if (!scrollContainer) return false;
    
    const rect = scrollContainer.getBoundingClientRect();
    const scrollLeft = scrollContainer.scrollLeft;
    const x = clientX - rect.left - 192 + scrollLeft; // 192 is the left panel width
    const clickPosition = x;
    const playheadPos = currentTime * pixelsPerSecond;
    
    // Return true if click is within 8 pixels of playhead
    return Math.abs(clickPosition - playheadPos) < 8;
  }, [currentTime, pixelsPerSecond]);

  // Helper function to detect target lane from mouse position
  const detectTargetLane = useCallback((clientY: number, clipType: 'video' | 'text' | 'sound'): { laneIndex: number, laneType: 'video' | 'text' | 'sound' } | null => { // eslint-disable-line @typescript-eslint/no-unused-vars
    const container = document.querySelector('.timeline-content');
    if (!container) return null;
    
    const rect = container.getBoundingClientRect();
    const y = clientY - rect.top;
    
    // Calculate track heights
    const headerHeight = 32;
    const videoTrackHeight = 32;
    const textTrackHeight = 32;
    const soundTrackHeight = 48; // Each sound lane is 48px
    
    let currentY = headerHeight;
    
    // Check video lanes (reversed order in DOM)
    const videoSectionHeight = videoLanes.length * videoTrackHeight;
    if (y >= currentY && y < currentY + videoSectionHeight) {
      const videoLaneY = y - currentY;
      const reversedLaneIndex = Math.floor(videoLaneY / videoTrackHeight);
      // Convert back to original lane index (reverse the reversal)
      const laneIndex = videoLanes.length - 1 - reversedLaneIndex;
      if (laneIndex >= 0 && laneIndex < videoLanes.length) {
        return { laneIndex: videoLanes[laneIndex], laneType: 'video' };
      }
    }
    currentY += videoSectionHeight;
    
    // Check text lanes  
    const textSectionHeight = textLanes.length * textTrackHeight;
    if (y >= currentY && y < currentY + textSectionHeight) {
      const textLaneY = y - currentY;
      const laneIndex = Math.floor(textLaneY / textTrackHeight);
      if (laneIndex >= 0 && laneIndex < textLanes.length) {
        return { laneIndex: textLanes[laneIndex], laneType: 'text' };
      }
    }
    currentY += textSectionHeight;
    
    // Check sound lanes
    const soundSectionHeight = soundLanes.length * soundTrackHeight;
    if (y >= currentY && y < currentY + soundSectionHeight) {
      const soundLaneY = y - currentY;
      const laneIndex = Math.floor(soundLaneY / soundTrackHeight);
      if (laneIndex >= 0 && laneIndex < soundLanes.length) {
        return { laneIndex: soundLanes[laneIndex], laneType: 'sound' };
      }
    }
    
    return null;
  }, [soundLanes, textLanes, videoLanes]);

  // Calculate timeline duration with zoom
  const basePixelsPerSecond = 40;
  
  // 기본 스케일로 총 시간 계산 (초 단위) - props로 받거나 직접 계산
  const totalDurationInSeconds = propTotalDuration ?? calculateTimelineDuration(clips, textClips, soundClips, basePixelsPerSecond);
  const minimumDuration = 180; // 180초 (3분) - 기본 표시 시간
  const bufferTime = 10; // 10초 버퍼
  const timelineLengthInSeconds = Math.max(minimumDuration, Math.ceil(totalDurationInSeconds + bufferTime));
  
  // 줌 적용된 픽셀 값
  const timeMarkers = generateTimeMarkers(timelineLengthInSeconds);
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
    // Check if click is near playhead first - if so, start dragging playhead instead
    if (isNearPlayhead(e.clientX)) {
      e.preventDefault();
      e.stopPropagation();
      setIsDraggingPlayhead(true);
      return;
    }
    
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
    const time = Math.max(0, Math.min(x / pixelsPerSecond, Math.min(180, totalDurationInSeconds)));
    onSeek(time);
  };

  // Handle track click for seeking
  const handleTrackClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // Check if click is near playhead first - if so, start dragging instead of seeking
    if (isNearPlayhead(e.clientX)) {
      e.preventDefault();
      e.stopPropagation();
      setIsDraggingPlayhead(true);
      return;
    }
    
    if ((e.target as HTMLElement).closest('.timeline-clip')) return;
    if (e.shiftKey || isSelectingRange || isAdjustingSelection || isMovingSelection) return;
    if (!onSeek || isResizing || isDragging) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const time = Math.max(0, Math.min(x / pixelsPerSecond, Math.min(180, totalDurationInSeconds)));
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
    // Check if click is near playhead first
    if (isNearPlayhead(e.clientX)) {
      e.preventDefault();
      e.stopPropagation();
      setIsDraggingPlayhead(true);
      return;
    }
    
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
      // Store last mouse event for lane detection
      // setLastMouseEvent(e);
      
      if (!activeClip) return;

      // For all clip types, detect target lane during drag
      if (isDragging && activeClipType) {
        const targetLane = detectTargetLane(e.clientY, activeClipType);
        setDragTargetLane(targetLane);
      }

      if (isResizing) {
        const delta = e.clientX - dragStartX;
        const activated = checkResizeActivation(e.clientX);
        
        if (!activated) return;

        let newWidth = startWidth;
        let newPosition = startPosition;

        // Calculate new dimensions based on resize handle
        let minAllowedPosition = startPosition; // Default position
        
        // Get current clip to check constraints
        type ClipWithConstraints = {
          id: string;
          maxDuration?: number;
          startTime?: number;
        };
        
        let currentClip: ClipWithConstraints | undefined = undefined;
        if (activeClipType === 'video') {
          currentClip = clips.find(c => c.id === activeClip);
        } else if (activeClipType === 'text') {
          currentClip = textClips.find(c => c.id === activeClip);
        } else if (activeClipType === 'sound') {
          currentClip = soundClips.find(c => c.id === activeClip);
        }
        
        if (currentClip) {
          // Calculate minimum allowed position for left handle based on startTime
          if (resizeHandle === 'left' && currentClip.startTime !== undefined) {
            const currentStartTime = currentClip.startTime || 0;
            if (currentStartTime <= 0) {
              // If startTime is 0 or negative, cannot resize left further
              minAllowedPosition = startPosition;
            }
          }
        }

        if (resizeHandle === 'left') {
          newPosition = Math.max(minAllowedPosition, startPosition + delta);
          newWidth = startWidth + (startPosition - newPosition);
          
          // Ensure we don't exceed maxDuration when resizing left
          if (currentClip?.maxDuration && newWidth > currentClip.maxDuration) {
            newWidth = currentClip.maxDuration;
            newPosition = startPosition + startWidth - newWidth;
          }
        } else {
          newWidth = startWidth + delta;
          
          // Limit width to maxDuration for right handle
          if (currentClip?.maxDuration) {
            newWidth = Math.min(newWidth, currentClip.maxDuration);
          }
        }

        // Apply minimum constraints
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
          
          // Import common clip handling utilities
          import('../_utils/common-clip-utils').then(({ handleClipDrag }) => {
            if (activeClipType === 'video' && onUpdateAllVideoClips) {
              handleClipDrag(activeClip, 'video', clips, delta, dragTargetLane, onUpdateAllVideoClips);
            } else if (activeClipType === 'text' && onUpdateAllTextClips) {
              handleClipDrag(activeClip, 'text', textClips, delta, dragTargetLane, onUpdateAllTextClips);
            } else if (activeClipType === 'sound' && onUpdateAllSoundClips) {
              handleClipDrag(activeClip, 'sound', soundClips, delta, dragTargetLane, onUpdateAllSoundClips);
              clipElement.style.transform = '';
              return;
            }
          });
          clipElement.style.transform = '';
        }
        
        // Handle resize end using common utility
        if (clipElement && isResizing && resizeMoved) {
          const finalWidth = finalResizeWidth || startWidth;
          const finalPosition = resizeHandle === 'left' ? finalResizePosition : startPosition;
          
          import('../_utils/common-clip-utils').then(({ handleClipResize }) => {
            if (activeClipType === 'video') {
              handleClipResize(
                activeClip, 
                'video', 
                clips, 
                finalWidth, 
                finalPosition, 
                resizeHandle || 'right',
                onUpdateVideoClipPosition,
                onResizeVideoClip
              );
            } else if (activeClipType === 'text') {
              handleClipResize(
                activeClip, 
                'text', 
                textClips, 
                finalWidth, 
                finalPosition, 
                resizeHandle || 'right',
                onUpdateTextClipPosition,
                onResizeTextClip
              );
            } else if (activeClipType === 'sound') {
              handleClipResize(
                activeClip, 
                'sound', 
                soundClips, 
                finalWidth, 
                finalPosition, 
                resizeHandle || 'right',
                onUpdateSoundClipPosition,
                onResizeSoundClip
              );
            }
          });
        }
      }
      
      setActiveClipInfo(null, null);
      setDragTargetLane(null);
      // setLastMouseEvent(null);
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
      } else {
        // 유효한 드래그 선택이 있었다면, 최종적으로 선택된 클립들을 업데이트
        const left = start;
        const right = end;
        const top = Math.min(selectionStartY, selectionCurrentY);
        const bottom = Math.max(selectionStartY, selectionCurrentY);
        updateRectSelectedClips(left, right, top, bottom);
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
      // 직접 계산하여 클로저 이슈 방지 + 초당 과도한 onSeek 호출 제한
      const basePixelsPerSecond = 40;
      const time = Math.max(0, Math.min(x / basePixelsPerSecond, 180)); // 3분(180초) 제한

      // 프레임 단위(1/30초)로 스로틀링하여 setState 연쇄 방지
      const quantizedTime = Math.round(time * 30) / 30;
      onSeek(quantizedTime);
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
  }, [isDraggingPlayhead, onSeek, setIsDraggingPlayhead]);

  // Mouse move effect for cursor feedback near playhead
  useEffect(() => {
    const handleMouseMoveForCursor = (e: MouseEvent) => {
      // Only change cursor if not dragging anything
      if (isDragging || isResizing || isDraggingPlayhead || isSelectingRange) return;
      
      const scrollContainer = document.querySelector('.timeline-content .overflow-x-auto');
      if (!scrollContainer) return;
      
      // Check if mouse is near playhead
      if (isNearPlayhead(e.clientX)) {
        document.body.style.cursor = 'ew-resize';
      } else {
        document.body.style.cursor = '';
      }
    };
    
    document.addEventListener('mousemove', handleMouseMoveForCursor);
    return () => {
      document.removeEventListener('mousemove', handleMouseMoveForCursor);
      document.body.style.cursor = '';
    };
  }, [isDragging, isResizing, isDraggingPlayhead, isSelectingRange, isNearPlayhead]);


  // Get selection bounds for rendering
  const selectionBounds = getSelectionBounds();

  return (
    <div className="bg-gray-800 border-t border-gray-700 flex flex-col h-full">
      {/* Playback controls */}
      <TimelineControls
        isPlaying={isPlaying}
        currentTime={currentTime}
        totalDuration={totalDurationInSeconds}
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
            
            {/* Lane Controls */}
            <div className="flex items-center gap-2 mr-4">
              <span className="text-[10px] text-gray-400 font-medium">Lanes:</span>
              
              {/* Add Video Lane button */}
              {canAddNewVideoLane(videoLanes) && (
                <button 
                  onClick={onAddVideoLane}
                  className="px-2 py-1 bg-gray-800 hover:bg-gray-700 rounded text-xs flex items-center gap-1 transition-colors border border-gray-600 border-dashed"
                  title="Add Video Lane"
                >
                  <i className="ri-video-line text-[11px] text-green-400"></i>
                  <span className="text-[10px] text-gray-300">+Video</span>
                  <span className="text-[10px] text-gray-500">({videoLanes.length}/3)</span>
                </button>
              )}
              
              {!canAddNewVideoLane(videoLanes) && (
                <div className="px-2 py-1 bg-gray-900 rounded text-xs flex items-center gap-1 border border-gray-700">
                  <i className="ri-video-line text-[11px] text-gray-600"></i>
                  <span className="text-[10px] text-gray-600">Video</span>
                  <span className="text-[10px] text-gray-600">(3/3)</span>
                </div>
              )}
              
              {/* Add Text Lane button */}
              {canAddNewTextLane(textLanes) && (
                <button 
                  onClick={onAddTextLane}
                  className="px-2 py-1 bg-gray-800 hover:bg-gray-700 rounded text-xs flex items-center gap-1 transition-colors border border-gray-600 border-dashed"
                  title="Add Text Lane"
                >
                  <i className="ri-text text-[11px] text-blue-400"></i>
                  <span className="text-[10px] text-gray-300">+Text</span>
                  <span className="text-[10px] text-gray-500">({textLanes.length}/3)</span>
                </button>
              )}
              
              {!canAddNewTextLane(textLanes) && (
                <div className="px-2 py-1 bg-gray-900 rounded text-xs flex items-center gap-1 border border-gray-700">
                  <i className="ri-text text-[11px] text-gray-600"></i>
                  <span className="text-[10px] text-gray-600">Text</span>
                  <span className="text-[10px] text-gray-600">(3/3)</span>
                </div>
              )}

              {/* Add Sound Lane button */}
              {canAddNewLane(soundLanes) && (
                <button 
                  onClick={onAddSoundLane}
                  className="px-2 py-1 bg-gray-800 hover:bg-gray-700 rounded text-xs flex items-center gap-1 transition-colors border border-gray-600 border-dashed"
                  title="Add Sound Lane"
                >
                  <i className="ri-music-line text-[11px] text-amber-400"></i>
                  <span className="text-[10px] text-gray-300">+Sound</span>
                  <span className="text-[10px] text-gray-500">({soundLanes.length}/3)</span>
                </button>
              )}
              
              {!canAddNewLane(soundLanes) && (
                <div className="px-2 py-1 bg-gray-900 rounded text-xs flex items-center gap-1 border border-gray-700">
                  <i className="ri-music-line text-[11px] text-gray-600"></i>
                  <span className="text-[10px] text-gray-600">Sound</span>
                  <span className="text-[10px] text-gray-600">(3/3)</span>
                </div>
              )}
            </div>

            <div className="ml-auto flex items-center gap-4">
              {/* 줌 컨트롤 */}
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleZoomChange('out')}
                  disabled={Math.round((pixelsPerSecond / 40) * 100) <= 50}
                  className={`px-2 py-1 rounded text-xs flex items-center gap-1 transition-colors ${
                    Math.round((pixelsPerSecond / 40) * 100) <= 50
                      ? 'bg-gray-900 text-gray-600 cursor-not-allowed'
                      : 'bg-gray-800 hover:bg-gray-700'
                  }`}
                  title="줌 아웃 (최소 50%)"
                >
                  <i className="ri-zoom-out-line text-[11px]"></i>
                </button>
                <span className="text-[10px] text-gray-400 min-w-[60px] text-center">
                  {Math.round((pixelsPerSecond / 40) * 100)}%
                </span>
                <button
                  onClick={() => handleZoomChange('in')}
                  disabled={Math.round((pixelsPerSecond / 40) * 100) >= 200}
                  className={`px-2 py-1 rounded text-xs flex items-center gap-1 transition-colors ${
                    Math.round((pixelsPerSecond / 40) * 100) >= 200
                      ? 'bg-gray-900 text-gray-600 cursor-not-allowed'
                      : 'bg-gray-800 hover:bg-gray-700'
                  }`}
                  title="줌 인 (최대 200%)"
                >
                  <i className="ri-zoom-in-line text-[11px]"></i>
                </button>
              </div>
              
              <div className="text-[10px] text-gray-400">
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
        </div>
        
        {/* Timeline content */}
        <div className="flex overflow-x-auto">
          {/* Left fixed area */}
          <div className="flex-shrink-0 w-48">
            {/* Header */}
            <div className="border-b border-r border-gray-700 p-1 h-8 flex items-center justify-center">
              <span className="text-[10px] text-gray-400 font-medium">Timeline</span>
            </div>
        
            {/* Video Lanes Section */}
            {videoLanes.slice().reverse().map((laneIndex) => (
              <div key={`video-lane-${laneIndex}`} className="border-b border-r border-gray-700 h-8 flex items-center justify-between px-2 bg-gray-950/30">
                <span className="text-[10px] text-blue-400 font-medium">Video {laneIndex + 1}</span>
                <div className="flex items-center gap-1">
                  <button 
                    onClick={() => onAddVideoToLane?.(laneIndex)}
                    className="flex-1 h-5 bg-black rounded flex items-center justify-center gap-1 hover:bg-gray-900 transition-colors group min-w-[60px]"
                  >
                    <i className="ri-add-line text-[10px] text-[#38f47cf9] group-hover:text-white"></i>
                    <span className="text-[10px] text-[#38f47cf9] group-hover:text-white">Add</span>
                  </button>
                  {laneIndex > 0 && (
                    <button 
                      onClick={() => onDeleteVideoLane?.(laneIndex)}
                      className="w-4 h-4 bg-red-900 rounded flex items-center justify-center hover:bg-red-800 transition-colors group"
                      title={`Delete Video Lane ${laneIndex + 1}`}
                    >
                      <i className="ri-close-line text-[8px] text-red-400 group-hover:text-white"></i>
                    </button>
                  )}
                </div>
              </div>
            ))}

            {/* Text Lanes Section */}
            {textLanes.map((laneIndex) => (
              <div key={`text-lane-${laneIndex}`} className="border-b border-r border-gray-700 h-8 flex items-center justify-between px-2 bg-gray-950/20">
                <span className="text-[10px] text-green-400 font-medium">Text {laneIndex + 1}</span>
                <div className="flex items-center gap-1">
                  <button 
                    onClick={() => onAddTextToLane?.(laneIndex)}
                    className="flex-1 h-5 bg-black rounded flex items-center justify-center gap-1 hover:bg-gray-900 transition-colors group min-w-[60px]"
                  >
                    <i className="ri-add-line text-[10px] text-[#38f47cf9] group-hover:text-white"></i>
                    <span className="text-[10px] text-[#38f47cf9] group-hover:text-white">Add</span>
                  </button>
                  {laneIndex > 0 && (
                    <button 
                      onClick={() => onDeleteTextLane?.(laneIndex)}
                      className="w-4 h-4 bg-red-900 rounded flex items-center justify-center hover:bg-red-800 transition-colors group"
                      title={`Delete Text Lane ${laneIndex + 1}`}
                    >
                      <i className="ri-close-line text-[8px] text-red-400 group-hover:text-white"></i>
                    </button>
                  )}
                </div>
              </div>
            ))}

            {/* Sound Lanes Section */}
            {soundLanes.map((laneIndex) => (
              <div key={`sound-lane-${laneIndex}`} className="border-r border-gray-700 h-12 flex items-center justify-between px-2 bg-gray-950/10">
                <span className="text-[10px] text-purple-400 font-medium">Sound {laneIndex + 1}</span>
                <div className="flex items-center gap-1">
                  <button 
                    onClick={() => onAddSoundToLane?.(laneIndex)}
                    className="flex-1 h-6 bg-black rounded flex items-center justify-center gap-1.5 hover:bg-gray-900 transition-colors group min-w-[60px]"
                  >
                    <i className="ri-music-line text-[10px] text-[#38f47cf9] group-hover:text-white"></i>
                    <span className="text-[10px] text-[#38f47cf9] group-hover:text-white">Add</span>
                  </button>
                  {laneIndex > 0 && (
                    <button 
                      onClick={() => onDeleteSoundLane?.(laneIndex)}
                      className="w-4 h-4 bg-red-900 rounded flex items-center justify-center hover:bg-red-800 transition-colors group"
                      title={`Delete Sound Lane ${laneIndex + 1}`}
                    >
                      <i className="ri-close-line text-[8px] text-red-400 group-hover:text-white"></i>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Right scrollable area */}
          <div
            className="flex-1 relative"
            style={{ minWidth: `${timelineLengthInSeconds * pixelsPerSecond}px` }}
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
                {/* 3-minute limit warning line */}
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-20"
                  style={{ 
                    left: `${180 * pixelsPerSecond}px`,
                    boxShadow: '0 0 4px rgba(239, 68, 68, 0.5)'
                  }}
                  title="3-minute limit"
                />
              </div>
            </div>

            {/* 3-minute limit warning line extending across all tracks */}
            <div
              className="absolute top-8 bottom-0 w-0.5 bg-red-500 opacity-30 z-10 pointer-events-none"
              style={{ 
                left: `${180 * pixelsPerSecond}px`
              }}
            />

            {/* Video tracks - render each lane (하위 레이어부터 표시) */}
            {videoLanes.slice().reverse().map((laneIndex) => (
              <TimelineTrack
                key={`video-lane-${laneIndex}`}
                type="video"
                clips={getVideoClipsForLane(clips, laneIndex)}
                laneIndex={laneIndex}
                selectedClips={selectedClip === null ? [] : [selectedClip]}
                rectSelectedClips={rectSelectedClips}
                onClipClick={selectClip}
                onMouseDown={handleMouseDown}
                onResizeStart={handleResizeStart}
                onDeleteClip={onDeleteVideoClip}
                activeClip={activeClip}
                pixelsPerSecond={pixelsPerSecond}
                isSelectingRange={isSelectingRange}
                onTrackClick={handleTrackClick}
              />
            ))}

            {/* Text tracks - render each lane */}
            {textLanes.map((laneIndex) => (
              <TimelineTrack
                key={`text-lane-${laneIndex}`}
                type="text"
                clips={getTextClipsForLane(textClips, laneIndex)}
                laneIndex={laneIndex}
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
            ))}

            {/* Sound tracks - render each lane */}
            {soundLanes.map((laneIndex) => (
              <TimelineTrack
                key={`sound-lane-${laneIndex}`}
                type="sound"
                clips={getClipsForLane(soundClips, laneIndex)}
                laneIndex={laneIndex}
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
            ))}

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

            {/* Timeline Grid - 초별 점선 가이드라인 */}
            <TimelineGrid
              timelineLengthInSeconds={timelineLengthInSeconds}
              pixelsPerSecond={pixelsPerSecond}
              height="100%"
            />

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