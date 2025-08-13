'use client';

import { useState, useEffect, useRef } from 'react';
import { VideoClip as VideoClipType, TextClip as TextClipType, SoundClip as SoundClipType } from '@/types/video-editor';
import { validateClipDuration, getTimelineEnd, BaseClip } from '../_utils/timeline-utils';
import TextClip from './TextClip';
import SoundClip from './SoundClip';
import TimelineControls from './TimelineControls';


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
  onUpdateVideoClipPosition,
  onUpdateTextClipPosition,
  onResizeVideoClip,
  onUpdateSoundClipPosition,
  onUpdateAllVideoClips,
  onUpdateAllTextClips,
  onUpdateAllSoundClips,
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
  const [selectedClip, setSelectedClip] = useState<string | null>(null);
  const [selectedClipType, setSelectedClipType] = useState<'video' | 'text' | 'sound' | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragStartX, setDragStartX] = useState(0);
  const [startWidth, setStartWidth] = useState(0);
  const [startPosition, setStartPosition] = useState(0);
  const [resizeHandle, setResizeHandle] = useState<'left' | 'right' | null>(null);
  const playheadRef = useRef<HTMLDivElement>(null);
  const [isDraggingPlayhead, setIsDraggingPlayhead] = useState(false);
  const [dragDirection, setDragDirection] = useState<'left' | 'right'>('right');
  const [initialDragX, setInitialDragX] = useState(0);
  const [resizeMoved, setResizeMoved] = useState(false);
  const RESIZE_ACTIVATION_DELTA = 10;
  const [finalResizeWidth, setFinalResizeWidth] = useState(0);
  const [finalResizePosition, setFinalResizePosition] = useState(0);
  
  // Shift + 드래그 범위 선택 상태
  const [isSelectingRange, setIsSelectingRange] = useState(false);
  const selectionContainerRef = useRef<HTMLDivElement>(null);
  const [selectionStartX, setSelectionStartX] = useState<number | null>(null);
  const [selectionCurrentX, setSelectionCurrentX] = useState<number | null>(null);
  const [selectionStartY, setSelectionStartY] = useState<number | null>(null);
  const [selectionCurrentY, setSelectionCurrentY] = useState<number | null>(null);
  // 지속되는 선택 영역 상태 (마우스 업 후 유지)
  const [isRangeActive, setIsRangeActive] = useState(false);
  const [selectionRangeStartX, setSelectionRangeStartX] = useState<number | null>(null);
  const [selectionRangeEndX, setSelectionRangeEndX] = useState<number | null>(null);
  const [selectionRangeStartY, setSelectionRangeStartY] = useState<number | null>(null);
  const [selectionRangeEndY, setSelectionRangeEndY] = useState<number | null>(null);
  // 선택 영역 조절(리사이즈) 상태
  const [isAdjustingSelection, setIsAdjustingSelection] = useState(false);
  const [selectionResizeHandle, setSelectionResizeHandle] = useState<'left' | 'right' | 'top' | 'bottom' | null>(null);
  const [selectionDragStartClientX, setSelectionDragStartClientX] = useState(0);
  const [selectionDragStartClientY, setSelectionDragStartClientY] = useState(0);
  const [selectionInitialStartX, setSelectionInitialStartX] = useState(0);
  const [selectionInitialEndX, setSelectionInitialEndX] = useState(0);
  const [selectionInitialStartY, setSelectionInitialStartY] = useState(0);
  const [selectionInitialEndY, setSelectionInitialEndY] = useState(0);

  // 활성 선택 박스 이동 상태
  const [isMovingSelection, setIsMovingSelection] = useState(false);
  const [moveStartClientX, setMoveStartClientX] = useState(0);
  const [moveStartClientY, setMoveStartClientY] = useState(0);
  const [moveInitialStartX, setMoveInitialStartX] = useState(0);
  const [moveInitialEndX, setMoveInitialEndX] = useState(0);
  const [moveInitialStartY, setMoveInitialStartY] = useState(0);
  const [moveInitialEndY, setMoveInitialEndY] = useState(0);
  // 사각형으로 선택된 클립 목록 (데스크탑 선택 방식)
  const [rectSelectedClips, setRectSelectedClips] = useState<{ id: string; type: 'video' | 'text' | 'sound' }[]>([]);

  // 사각형 범위와 겹치는 타임라인 클립들을 계산하여 선택 목록 갱신
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

  const handleMouseDown = (e: React.MouseEvent, clipId: string, clipType: 'video' | 'text' | 'sound') => {
    // Shift 드래그 범위 선택 중에는 클립 드래그 비활성화
    if (e.shiftKey || isSelectingRange || isAdjustingSelection || isMovingSelection) {
      return;
    }
    if ((e.target as HTMLElement).classList.contains('resize-handle')) {
      return;
    }
    setIsDragging(true);
    setActiveClip(clipId);
    setInitialDragX(e.clientX);
    setDragStartX(e.clientX);
    
    // 클립 선택 상태 설정
    setSelectedClip(clipId);
    setSelectedClipType(clipType);
  };

  // 클립 클릭으로 선택 처리 (멀티 선택이 있으면 해제하고 단일 선택으로 전환)
  const handleClipClick = (clipId: string, clipType: 'video' | 'text' | 'sound') => {
    if (rectSelectedClips.length > 0) {
      setRectSelectedClips([]);
    }
    setSelectedClip(clipId);
    setSelectedClipType(clipType);
  };

  // 툴바 액션 핸들러
  const handleToolbarAction = (action: 'edit' | 'duplicate' | 'split' | 'delete') => {
    // 다중 선택이 존재할 경우 Delete는 다중 삭제 우선 처리
    if (action === 'delete') {
      if (rectSelectedClips.length > 0) {
        rectSelectedClips.forEach(({ id, type }) => {
          if (type === 'video' && onDeleteVideoClip) onDeleteVideoClip(id);
          if (type === 'text' && onDeleteTextClip) onDeleteTextClip(id);
          if (type === 'sound' && onDeleteSoundClip) onDeleteSoundClip(id);
        });
        setRectSelectedClips([]);
        setSelectedClip(null);
        setSelectedClipType(null);
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
        setSelectedClip(null);
        setSelectedClipType(null);
        break;
    }
  };

  // 분할 가능 여부 체크
  const canSplit = () => {
    if (!selectedClip || !selectedClipType) return false;

    const playheadPosition = currentTime * pixelsPerSecond;
    
    if (selectedClipType === 'video') {
      const clip = clips.find(c => c.id === selectedClip);
      if (clip) {
        return playheadPosition > clip.position && playheadPosition < clip.position + clip.duration;
      }
    } else if (selectedClipType === 'text') {
      const clip = textClips.find(c => c.id === selectedClip);
      if (clip) {
        return playheadPosition > clip.position && playheadPosition < clip.position + clip.duration;
      }
    } else if (selectedClipType === 'sound') {
      const clip = soundClips.find(c => c.id === selectedClip);
      if (clip) {
        return playheadPosition > clip.position && playheadPosition < clip.position + clip.duration;
      }
    }
    
    return false;
  };

  const handleResizeStart = (e: React.MouseEvent, clipId: string, handle: 'left' | 'right', clipType: 'video' | 'text' | 'sound' = 'video') => {
    // Shift 범위 선택 제스처 우선
    if (e.shiftKey || isSelectingRange || isAdjustingSelection || isMovingSelection) {
      e.stopPropagation();
      e.preventDefault();
      return;
    }
    e.stopPropagation();
    e.preventDefault(); // 이벤트 전파 방지
    setIsResizing(true);
    setResizeHandle(handle);
    setActiveClip(clipId);
    setActiveClipType(clipType);
    setDragStartX(e.clientX);
    setResizeMoved(false);
    
    // 현재 클립의 duration과 position 값을 가져와서 저장
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
    
    setStartWidth(currentWidth);
    setStartPosition(currentPosition);
    // 초기값 설정 - 리사이징 시작 시 현재 값으로 초기화
    setFinalResizeWidth(currentWidth);
    setFinalResizePosition(currentPosition);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!activeClip) return;

      if (isResizing) {
        const delta = e.clientX - dragStartX;
        const moveDistance = Math.abs(delta);
        
        // 아직 resizeMoved가 false이고, 움직인 거리가 임계값을 넘으면 true로 설정
        if (!resizeMoved && moveDistance > RESIZE_ACTIVATION_DELTA) {
          setResizeMoved(true);
        }

        let newWidth = startWidth;
        let newPosition = startPosition;
        let isBlocked = false; // 초기 블로킹 플래그

        // 같은 트랙의 다른 클립들 가져오기 (현재 클립 제외)
        let trackClips: BaseClip[] = [];
        if (activeClipType === 'video') {
          trackClips = clips.filter(c => c.id !== activeClip);
        } else if (activeClipType === 'text') {
          trackClips = textClips.filter(c => c.id !== activeClip);
        } else if (activeClipType === 'sound') {
          trackClips = soundClips.filter(c => c.id !== activeClip);
        }

        // 인접 클립 찾기
        const leftAdjacentClip = trackClips
          .filter(c => c.position + c.duration <= startPosition)
          .sort((a, b) => (b.position + b.duration) - (a.position + a.duration))[0];
        
        const rightAdjacentClip = trackClips
          .filter(c => c.position >= startPosition + startWidth)
          .sort((a, b) => a.position - b.position)[0];

        if (resizeHandle === 'left') {
          // 왼쪽 핸들: 양방향 리사이즈 가능 (원본 범위 내에서)
          // delta < 0: 왼쪽으로 확장, delta > 0: 오른쪽으로 축소
          
          // 초기 블로킹 체크: 원본 시작점에서 더 확장 불가
          if (activeClipType === 'video' || activeClipType === 'sound') {
            const clipData = activeClipType === 'video' 
              ? clips.find(c => c.id === activeClip)
              : soundClips.find(c => c.id === activeClip);
            
            if (clipData) {
              const currentStartTime = clipData.startTime || 0;
              // 이미 원본 시작점(0)에 있고 더 왼쪽으로 확장하려는 경우
              if (currentStartTime === 0 && delta < 0) {
                isBlocked = true;
                newPosition = startPosition;
                newWidth = startWidth;
              }
            }
          }
          
          // 블로킹되지 않은 경우에만 계산 수행
          if (!isBlocked) {
            // 기본 계산
            newPosition = Math.max(0, startPosition + delta);
            newWidth = startWidth + (startPosition - newPosition);
            
            // 1. 왼쪽 인접 클립과의 충돌 체크
            if (leftAdjacentClip) {
              const minPosition = leftAdjacentClip.position + leftAdjacentClip.duration;
              if (newPosition < minPosition) {
                newPosition = minPosition;
                newWidth = startPosition + startWidth - newPosition;
              }
            }
            
            // 2. 원본 범위 체크 (video/sound만)
            if (activeClipType === 'video' || activeClipType === 'sound') {
              const clipData = activeClipType === 'video' 
                ? clips.find(c => c.id === activeClip)
                : soundClips.find(c => c.id === activeClip);
              
              if (clipData) {
                const currentStartTime = clipData.startTime || 0;
                const maxDuration = clipData.maxDuration || Infinity;
                
                // 왼쪽으로 확장 시 원본 시작점(0) 체크
                const deltaPositionPx = newPosition - startPosition;
                const newStartTimeSeconds = currentStartTime + (deltaPositionPx / pixelsPerSecond);
                
                if (newStartTimeSeconds < 0) {
                  // 원본 시작점을 넘어서는 확장 제한
                  const maxExpansion = currentStartTime * pixelsPerSecond;
                  newPosition = Math.max(0, startPosition - maxExpansion);
                  newWidth = startWidth + (startPosition - newPosition);
                }
                
                // 원본 끝점을 넘어서지 않도록 제한
                const newEndTimeSeconds = newStartTimeSeconds + (newWidth / pixelsPerSecond);
                if (isFinite(maxDuration / pixelsPerSecond) && newEndTimeSeconds > maxDuration / pixelsPerSecond) {
                  newWidth = (maxDuration / pixelsPerSecond - newStartTimeSeconds) * pixelsPerSecond;
                }
              }
            }
            
            // 3. 최종 최소 너비 체크
            if (newWidth < 80) {
              newWidth = 80;
              const maxPossiblePosition = startPosition + startWidth - 80;
              newPosition = Math.min(newPosition, maxPossiblePosition);
              newPosition = Math.max(0, newPosition);
            }
            
            // 4. Position 최종 검증
            newPosition = Math.max(0, newPosition);
            newWidth = startPosition + startWidth - newPosition;
            newWidth = Math.max(80, newWidth);
          }
          
        } else {
          // 오른쪽 핸들: 양방향 리사이즈 가능 (원본 범위 내에서)
          // delta > 0: 오른쪽으로 확장, delta < 0: 왼쪽으로 축소
          
          // 초기 블로킹 체크: 원본 끝점에서 더 확장 불가
          if (activeClipType === 'video' || activeClipType === 'sound') {
            const clipData = activeClipType === 'video'
              ? clips.find(c => c.id === activeClip)
              : soundClips.find(c => c.id === activeClip);
            
            if (clipData) {
              const currentStartTime = clipData.startTime || 0;
              const maxDuration = clipData.maxDuration || Infinity;
              
              if (isFinite(maxDuration)) {
                // 현재 클립의 끝 시간 계산
                const currentEndTimeSeconds = currentStartTime + (startWidth / pixelsPerSecond);
                const maxEndTimeSeconds = maxDuration / pixelsPerSecond;
                
                // 이미 원본 끝에 도달했고 더 오른쪽으로 확장하려는 경우
                if (Math.abs(currentEndTimeSeconds - maxEndTimeSeconds) < 0.01 && delta > 0) {
                  isBlocked = true;
                  newWidth = startWidth;
                }
              }
            }
          }
          
          // 블로킹되지 않은 경우에만 계산 수행
          if (!isBlocked) {
            // 기본 계산
            newWidth = startWidth + delta;
            
            // 1. 오른쪽 인접 클립과의 충돌 체크
            if (rightAdjacentClip) {
              const maxWidth = rightAdjacentClip.position - startPosition;
              if (newWidth > maxWidth) {
                newWidth = maxWidth;
              }
            }
            
            // 2. 원본 범위 체크 (video/sound만)
            if (activeClipType === 'video' || activeClipType === 'sound') {
              const clipData = activeClipType === 'video'
                ? clips.find(c => c.id === activeClip)
                : soundClips.find(c => c.id === activeClip);
              
              if (clipData) {
                const currentStartTime = clipData.startTime || 0;
                const maxDuration = clipData.maxDuration || Infinity;
                
                // 원본 길이를 초과하지 않도록 제한
                const maxAllowedWidth = isFinite(maxDuration) 
                  ? maxDuration - (currentStartTime * pixelsPerSecond)
                  : newWidth;
                
                newWidth = Math.min(newWidth, maxAllowedWidth);
              }
            }
            
            // 3. 최종 최소 너비 보장
            newWidth = Math.max(80, newWidth);
          }
        }

        // 블로킹되지 않은 경우에만 추가 처리
        if (!isBlocked) {
          // Apply max duration limits for all clip types (안전 장치)
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
        }

        // 최종 값 상태로 저장 (mouseUp에서 사용)
        // 블로킹 상태에 관계없이 항상 유효한 값을 저장
        setFinalResizeWidth(newWidth);
        setFinalResizePosition(newPosition);
        
        // DOM 업데이트 - 블로킹되지 않은 경우에만
        if (!isBlocked) {
          const clipElement = document.querySelector(`[data-clip-id="${activeClip}"]`) as HTMLElement;
          if (clipElement) {
            clipElement.style.width = `${newWidth}px`;
            if (resizeHandle === 'left') {
              clipElement.style.left = `${newPosition}px`;
            }
          }
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
          import('../_utils/timeline-utils').then(({ magneticPositioning, freePositioning }) => {
            // Handle position update for all clip types
            if (activeClipType === 'video' && onUpdateAllVideoClips) {
              const currentClip = clips.find(c => c.id === activeClip);
              if (currentClip) {
                const newPosition = Math.max(0, currentClip.position + delta);
                
                // Use magnetic positioning for video clips (always stay together)
                const { targetPosition, adjustedClips } = magneticPositioning(
                  clips,
                  activeClip,
                  newPosition,
                  currentClip.duration
                );
                
                
                // Update all clips including the dragged one
                const updatedClips = [
                  ...adjustedClips,
                  { ...currentClip, position: targetPosition }
                ].sort((a, b) => a.position - b.position);
                
                onUpdateAllVideoClips(updatedClips);
              }
            } else if (activeClipType === 'text' && onUpdateTextClipPosition) {
              const currentClip = textClips.find(c => c.id === activeClip);
              if (currentClip) {
                const newPosition = Math.max(0, currentClip.position + delta);
                
                // Use free positioning for text clips (no pushing)
                const targetPosition = freePositioning(
                  textClips,
                  activeClip,
                  newPosition,
                  currentClip.duration
                );
                
                // Only update the dragged clip
                onUpdateTextClipPosition(activeClip, targetPosition);
              }
            } else if (activeClipType === 'sound' && onUpdateSoundClipPosition) {
              const currentClip = soundClips.find(c => c.id === activeClip);
              if (currentClip) {
                const newPosition = Math.max(0, currentClip.position + delta);
                
                // Use free positioning for sound clips (no pushing)
                const targetPosition = freePositioning(
                  soundClips,
                  activeClip,
                  newPosition,
                  currentClip.duration
                );
                
                // Only update the dragged clip
                onUpdateSoundClipPosition(activeClip, targetPosition);
              }
            }
          });
          clipElement.style.transform = '';
        }
        // 리사이징 종료 시, 실제 duration과 position을 업데이트
        if (clipElement && isResizing) {
          
          // 클릭만 했다가 놓은 경우: 원래 값으로 복원
          if (!resizeMoved) {
            
            // 클립의 원래 position과 duration 값으로 스타일 복원
            let originalPosition = 0;
            let originalDuration = 0;
            
            if (activeClipType === 'video') {
              const clip = clips.find(c => c.id === activeClip);
              if (clip) {
                originalPosition = clip.position;
                originalDuration = clip.duration;
              }
            } else if (activeClipType === 'text') {
              const clip = textClips.find(c => c.id === activeClip);
              if (clip) {
                originalPosition = clip.position;
                originalDuration = clip.duration;
              }
            } else if (activeClipType === 'sound') {
              const clip = soundClips.find(c => c.id === activeClip);
              if (clip) {
                originalPosition = clip.position;
                originalDuration = clip.duration;
              }
            }
            
            clipElement.style.left = `${originalPosition}px`;
            clipElement.style.width = `${originalDuration}px`;
          } else {
            // DOM에서 읽지 말고 저장된 상태 사용
            const finalWidth = finalResizeWidth || startWidth;
            // 왼쪽 핸들로 리사이즈한 경우에만 position 변경
            const finalPosition = resizeHandle === 'left' 
              ? (finalResizePosition !== null && finalResizePosition !== undefined ? finalResizePosition : startPosition)
              : startPosition;
            
            // 안전장치: 너비가 0이거나 음수인 경우 원래 값 사용
            if (finalWidth <= 0) {
              console.warn('[Timeline] Invalid width detected:', finalWidth, 'Using original width:', startWidth);
              // 원래 값으로 복원
              let originalWidth = startWidth;
              let originalPosition = startPosition;
              
              if (activeClipType === 'video') {
                const clip = clips.find(c => c.id === activeClip);
                if (clip) {
                  originalWidth = clip.duration;
                  originalPosition = clip.position;
                }
              } else if (activeClipType === 'text') {
                const clip = textClips.find(c => c.id === activeClip);
                if (clip) {
                  originalWidth = clip.duration;
                  originalPosition = clip.position;
                }
              } else if (activeClipType === 'sound') {
                const clip = soundClips.find(c => c.id === activeClip);
                if (clip) {
                  originalWidth = clip.duration;
                  originalPosition = clip.position;
                }
              }
              
              // DOM 스타일 복원
              clipElement.style.width = `${originalWidth}px`;
              clipElement.style.left = `${originalPosition}px`;
              return; // 업데이트 호출하지 않음
            }
            
            if (activeClipType === 'video') {
              const clipData = clips.find(c => c.id === activeClip);
              const maxPx = clipData?.maxDuration ?? Infinity;
              const startSeconds = clipData?.startTime || 0;
              const endSeconds = clipData?.endTime;
              
              // 오른쪽 핸들로 리사이즈한 경우: endTime이 이미 maxDuration에 도달했다면 그대로 유지
              if (resizeHandle === 'right' && endSeconds && isFinite(maxPx)) {
                const maxEndSeconds = maxPx / pixelsPerSecond;
                if (Math.abs(endSeconds - maxEndSeconds) < 0.01) {
                  // 이미 끝에 도달한 상태, 현재 너비 유지
                  // 블로킹된 상태에서는 업데이트를 호출하지 않음 (이미 최대값에 있음)
                  // 스타일도 그대로 유지
                  return;
                }
              }
              
              // 왼쪽 핸들이면 새로운 startTime을 미리 계산하여 남은 길이 내에서만 허용
              const deltaPositionPx = resizeHandle === 'left' ? (finalPosition - startPosition) : 0;
              const newStartSeconds = Math.max(0, startSeconds + (deltaPositionPx / pixelsPerSecond));
              const maxAllowedWidth = isFinite(maxPx) ? Math.max(0, maxPx - (newStartSeconds * pixelsPerSecond)) : finalWidth;
              const clampedWidth = Math.min(finalWidth, maxAllowedWidth);
              
              // 왼쪽 핸들일 때는 position도 업데이트
              if (resizeHandle === 'left' && onUpdateVideoClipPosition) {
                onUpdateVideoClipPosition(activeClip, finalPosition);
              }
              if (onResizeVideoClip) {
                // 안전장치: 너비가 0이거나 음수면 호출하지 않음
                if (clampedWidth <= 0) {
                  console.error('[Timeline] Invalid clampedWidth:', clampedWidth, 'Skipping resize');
                  return;
                }
                // position 변화량 계산 (왼쪽 핸들일 때만)
                const deltaPosition = resizeHandle === 'left' ? finalPosition - startPosition : 0;
                onResizeVideoClip(activeClip, clampedWidth, resizeHandle || undefined, deltaPosition);
              }
            } else if (activeClipType === 'text') {
              // 왼쪽 핸들일 때는 position도 업데이트
              if (resizeHandle === 'left' && onUpdateTextClipPosition) {
                onUpdateTextClipPosition(activeClip, finalPosition);
              }
              if (onResizeTextClip) {
                onResizeTextClip(activeClip, finalWidth);
              }
            } else if (activeClipType === 'sound') {
              const clipData = soundClips.find(c => c.id === activeClip);
              const maxPx = clipData?.maxDuration ?? Infinity;
              const startSeconds = clipData?.startTime || 0;
              const deltaPositionPx = resizeHandle === 'left' ? (finalPosition - startPosition) : 0;
              const newStartSeconds = Math.max(0, startSeconds + (deltaPositionPx / pixelsPerSecond));
              const maxAllowedWidth = isFinite(maxPx) ? Math.max(0, maxPx - (newStartSeconds * pixelsPerSecond)) : finalWidth;
              const clampedWidth = Math.min(finalWidth, maxAllowedWidth);
              
              // 왼쪽 핸들일 때는 position도 업데이트
              if (resizeHandle === 'left' && onUpdateSoundClipPosition) {
                onUpdateSoundClipPosition(activeClip, finalPosition);
              }
              if (onResizeSoundClip) {
                // position 변화량 계산 (왼쪽 핸들일 때만)
                const deltaPosition = resizeHandle === 'left' ? finalPosition - startPosition : 0;
                onResizeSoundClip(activeClip, clampedWidth, resizeHandle || undefined, deltaPosition);
              }
            }

            // 스타일은 리셋하지 않고 유지 - React 상태 업데이트가 DOM을 다시 렌더링할 때까지
            // 인라인 스타일을 지우면 width가 0이 될 수 있음
            // React가 다음 렌더링 사이클에서 상태 기반으로 스타일을 다시 설정할 것임
          }
        }
      }
      setActiveClip(null);
      setActiveClipType(null);
      setIsDragging(false);
      setIsResizing(false);
      setResizeHandle(null);
      setResizeMoved(false);
      setFinalResizeWidth(0);
      setFinalResizePosition(0);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [activeClip, activeClipType, isDragging, isResizing, dragStartX, startWidth, startPosition, resizeHandle, clips, textClips, soundClips, onResizeVideoClip, onResizeTextClip, onResizeSoundClip, onUpdateVideoClipPosition, onUpdateTextClipPosition, onUpdateSoundClipPosition, onUpdateAllVideoClips, onUpdateAllTextClips, onUpdateAllSoundClips, pixelsPerSecond, dragDirection, initialDragX, resizeMoved, finalResizeWidth, finalResizePosition]);

  // 드래그 범위 선택 마우스 다운 (Shift 없이도 동작, 헤더 제외)
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
    if (y <= 32) return; // 타임라인 헤더(시킹) 보호

    e.preventDefault();
    e.stopPropagation();

    const clampedX = Math.max(0, Math.min(x, rect.width));
    const clampedY = Math.max(0, Math.min(y, rect.height));
    setIsRangeActive(false);
    setSelectionRangeStartX(null);
    setSelectionRangeEndX(null);
    setSelectionRangeStartY(null);
    setSelectionRangeEndY(null);
    setSelectedClip(null);
    setSelectedClipType(null);
    setRectSelectedClips([]);
    setIsSelectingRange(true);
    setSelectionStartX(clampedX);
    setSelectionCurrentX(clampedX);
    setSelectionStartY(clampedY);
    setSelectionCurrentY(clampedY);
  };

  // Shift + 드래그 범위 선택 진행/종료 처리
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
      setSelectionCurrentX(clampedX);
      setSelectionCurrentY(clampedY);
      const left = Math.min(selectionStartX ?? 0, clampedX);
      const right = Math.max(selectionStartX ?? 0, clampedX);
      const top = Math.min(selectionStartY ?? 0, clampedY);
      const bottom = Math.max(selectionStartY ?? 0, clampedY);
      updateRectSelectedClips(left, right, top, bottom);
    };

    const handleUp = () => {
      const container = selectionContainerRef.current;
      if (!container) {
        setIsSelectingRange(false);
        setSelectionStartX(null);
        setSelectionCurrentX(null);
        setSelectionStartY(null);
        setSelectionCurrentY(null);
        return;
      }
      if (selectionStartX === null || selectionCurrentX === null || selectionStartY === null || selectionCurrentY === null) {
        setIsSelectingRange(false);
        setSelectionStartX(null);
        setSelectionCurrentX(null);
        setSelectionStartY(null);
        setSelectionCurrentY(null);
        return;
      }

      const start = Math.min(selectionStartX, selectionCurrentX);
      const end = Math.max(selectionStartX, selectionCurrentX);
      const top = Math.min(selectionStartY, selectionCurrentY);
      const bottom = Math.max(selectionStartY, selectionCurrentY);
      const minDragPx = 5; // 오동작 방지
      if (end - start < minDragPx || bottom - top < 1) {
        setRectSelectedClips([]);
      }
      // 마우스 업 시 박스는 숨김, 선택만 유지
      setIsSelectingRange(false);
      setSelectionStartX(null);
      setSelectionCurrentX(null);
      setSelectionStartY(null);
      setSelectionCurrentY(null);
      setIsRangeActive(false);
      setSelectionRangeStartX(null);
      setSelectionRangeEndX(null);
      setSelectionRangeStartY(null);
      setSelectionRangeEndY(null);
    };

    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', handleUp);
    return () => {
      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('mouseup', handleUp);
    };
  }, [isSelectingRange, selectionStartX, selectionCurrentX, selectionStartY, selectionCurrentY]);

  // 선택 영역 리사이즈 핸들러
  const startAdjustSelection = (e: React.MouseEvent<HTMLDivElement>, handle: 'left' | 'right' | 'top' | 'bottom') => {
    e.preventDefault();
    e.stopPropagation();
    if (!isRangeActive || selectionRangeStartX === null || selectionRangeEndX === null || selectionRangeStartY === null || selectionRangeEndY === null) return;
    setIsAdjustingSelection(true);
    setSelectionResizeHandle(handle);
    setSelectionDragStartClientX(e.clientX);
    setSelectionDragStartClientY(e.clientY);
    setSelectionInitialStartX(selectionRangeStartX);
    setSelectionInitialEndX(selectionRangeEndX);
    setSelectionInitialStartY(selectionRangeStartY);
    setSelectionInitialEndY(selectionRangeEndY);
  };

  useEffect(() => {
    if (!isAdjustingSelection) return;

    const handleMove = (e: MouseEvent) => {
      const container = selectionContainerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const deltaX = e.clientX - selectionDragStartClientX;
      const deltaY = e.clientY - selectionDragStartClientY;
      const minWidth = 5;
      const minHeight = 5;

      let nextStartX = selectionInitialStartX;
      let nextEndX = selectionInitialEndX;
      let nextStartY = selectionInitialStartY;
      let nextEndY = selectionInitialEndY;

      if (selectionResizeHandle === 'left') {
        nextStartX = selectionInitialStartX + deltaX;
        nextStartX = Math.max(0, Math.min(nextStartX, nextEndX - minWidth));
      } else if (selectionResizeHandle === 'right') {
        nextEndX = selectionInitialEndX + deltaX;
        nextEndX = Math.min(rect.width, Math.max(nextEndX, nextStartX + minWidth));
      } else if (selectionResizeHandle === 'top') {
        nextStartY = selectionInitialStartY + deltaY;
        nextStartY = Math.max(0, Math.min(nextStartY, nextEndY - minHeight));
      } else if (selectionResizeHandle === 'bottom') {
        nextEndY = selectionInitialEndY + deltaY;
        nextEndY = Math.min(rect.height, Math.max(nextEndY, nextStartY + minHeight));
      }

      // 상태 업데이트
      setSelectionRangeStartX(nextStartX);
      setSelectionRangeEndX(nextEndX);
      setSelectionRangeStartY(nextStartY);
      setSelectionRangeEndY(nextEndY);

      // 조절 중에도 선택된 요소 갱신
      updateRectSelectedClips(nextStartX, nextEndX, nextStartY, nextEndY);
    };

    const handleUp = () => {
      setIsAdjustingSelection(false);
      setSelectionResizeHandle(null);
    };

    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', handleUp);
    return () => {
      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('mouseup', handleUp);
    };
  }, [isAdjustingSelection, selectionResizeHandle, selectionDragStartClientX, selectionDragStartClientY, selectionInitialStartX, selectionInitialEndX, selectionInitialStartY, selectionInitialEndY, selectionRangeStartX, selectionRangeEndX, selectionRangeStartY, selectionRangeEndY]);

  // 활성 선택 박스 이동 시작
  const startMoveSelection = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isRangeActive || selectionRangeStartX === null || selectionRangeEndX === null || selectionRangeStartY === null || selectionRangeEndY === null) return;
    setIsMovingSelection(true);
    setMoveStartClientX(e.clientX);
    setMoveStartClientY(e.clientY);
    setMoveInitialStartX(selectionRangeStartX);
    setMoveInitialEndX(selectionRangeEndX);
    setMoveInitialStartY(selectionRangeStartY);
    setMoveInitialEndY(selectionRangeEndY);
  };

  // 활성 선택 박스 이동 처리
  useEffect(() => {
    if (!isMovingSelection) return;

    const handleMove = (e: MouseEvent) => {
      const container = selectionContainerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const deltaX = e.clientX - moveStartClientX;
      const deltaY = e.clientY - moveStartClientY;
      // const width = moveInitialEndX - moveInitialStartX;
      // const height = moveInitialEndY - moveInitialStartY;

      let nextStartX = moveInitialStartX + deltaX;
      let nextEndX = moveInitialEndX + deltaX;
      let nextStartY = moveInitialStartY + deltaY;
      let nextEndY = moveInitialEndY + deltaY;

      // 경계 클램프
      if (nextStartX < 0) {
        nextEndX -= nextStartX; // shift right by deficit
        nextStartX = 0;
      }
      if (nextEndX > rect.width) {
        const overflow = nextEndX - rect.width;
        nextStartX -= overflow;
        nextEndX = rect.width;
      }
      if (nextStartY < 0) {
        nextEndY -= nextStartY;
        nextStartY = 0;
      }
      if (nextEndY > rect.height) {
        const overflow = nextEndY - rect.height;
        nextStartY -= overflow;
        nextEndY = rect.height;
      }

      // 최소 크기 유지
      if (nextEndX - nextStartX < 5) {
        nextEndX = nextStartX + 5;
      }
      if (nextEndY - nextStartY < 5) {
        nextEndY = nextStartY + 5;
      }

      setSelectionRangeStartX(nextStartX);
      setSelectionRangeEndX(nextEndX);
      setSelectionRangeStartY(nextStartY);
      setSelectionRangeEndY(nextEndY);

      updateRectSelectedClips(nextStartX, nextEndX, nextStartY, nextEndY);
    };

    const handleUp = () => {
      setIsMovingSelection(false);
    };

    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', handleUp);
    return () => {
      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('mouseup', handleUp);
    };
  }, [isMovingSelection, moveStartClientX, moveStartClientY, moveInitialStartX, moveInitialEndX, moveInitialStartY, moveInitialEndY]);

  // 전체 길이 계산 (초 단위) - 모든 트랙의 최대 끝 지점 계산
  const videoEnd = getTimelineEnd(clips) / pixelsPerSecond;
  const textEnd = getTimelineEnd(textClips) / pixelsPerSecond;
  const soundEnd = getTimelineEnd(soundClips) / pixelsPerSecond;
  const totalDuration = Math.max(videoEnd, textEnd, soundEnd, 0);

  // 타임라인 눈금: 기본 60초, 컨텐츠가 더 길면 자동 확장 (10초 여유 추가)
  const minimumDuration = 60; // 기본 60초
  const bufferTime = 10; // 여유 시간 10초
  const timelineLength = Math.max(minimumDuration, Math.ceil(totalDuration + bufferTime));
  
  const timeMarkers = Array.from({ length: timelineLength }, (_, i) => {
    const minutes = Math.floor(i / 60);
    const seconds = i % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  });

  // 플레이헤드 위치 계산 (픽셀)
  const playheadPosition = currentTime * pixelsPerSecond;

  // 타임라인 클릭으로 seek
  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // Shift 범위 선택 중에는 시킹 비활성화
    if (e.shiftKey || isSelectingRange || isAdjustingSelection || isMovingSelection) return;
    if (!onSeek || isResizing || isDragging) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const time = Math.max(0, Math.min(x / pixelsPerSecond, totalDuration));
    onSeek(time);
  };

  // 클립 트랙 영역 클릭으로 seek
  const handleTrackClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // 클립 자체를 클릭한 경우는 무시
    if ((e.target as HTMLElement).closest('.timeline-clip')) return;
    
    // Shift 범위 선택 중에는 시킹 비활성화
    if (e.shiftKey || isSelectingRange || isAdjustingSelection || isMovingSelection) return;
    if (!onSeek || isResizing || isDragging) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const time = Math.max(0, Math.min(x / pixelsPerSecond, totalDuration));
    onSeek(time);
  };


  // 플레이헤드 드래그 핸들러
  const handlePlayheadMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    // Shift 범위 선택 제스처 시 플레이헤드 드래그 비활성화
    if (e.shiftKey || isSelectingRange || isAdjustingSelection || isMovingSelection) return;
    setIsDraggingPlayhead(true);
  };

  useEffect(() => {
    const handlePlayheadMouseMove = (e: MouseEvent) => {
      if (!isDraggingPlayhead || !onSeek) return;
      
      // 스크롤 가능한 타임라인 영역 찾기
      const scrollContainer = document.querySelector('.timeline-content .overflow-x-auto');
      if (!scrollContainer) return;
      
      const rect = scrollContainer.getBoundingClientRect();
      const scrollLeft = scrollContainer.scrollLeft;
      
      // 클릭 위치에서 왼쪽 고정 영역(w-48) 너비를 빼고, 스크롤 위치를 더함
      const x = e.clientX - rect.left - 192 + scrollLeft; // 192px = 12rem (w-48)
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

  // 선택 박스 렌더링용 계산값
  // 선택 박스 렌더링용 계산값
  const selectingLeft = selectionStartX !== null && selectionCurrentX !== null
    ? Math.min(selectionStartX, selectionCurrentX)
    : 0;
  const selectingWidth = selectionStartX !== null && selectionCurrentX !== null
    ? Math.abs(selectionCurrentX - selectionStartX)
    : 0;
  const selectingTop = selectionStartY !== null && selectionCurrentY !== null
    ? Math.min(selectionStartY, selectionCurrentY)
    : 0;
  const selectingHeight = selectionStartY !== null && selectionCurrentY !== null
    ? Math.abs(selectionCurrentY - selectionStartY)
    : 0;
  const activeSelectionLeft = selectionRangeStartX !== null && selectionRangeEndX !== null
    ? Math.min(selectionRangeStartX, selectionRangeEndX)
    : 0;
  const activeSelectionWidth = selectionRangeStartX !== null && selectionRangeEndX !== null
    ? Math.abs(selectionRangeEndX - selectionRangeStartX)
    : 0;
  const activeSelectionTop = selectionRangeStartY !== null && selectionRangeEndY !== null
    ? Math.min(selectionRangeStartY, selectionRangeEndY)
    : 0;
  const activeSelectionHeight = selectionRangeStartY !== null && selectionRangeEndY !== null
    ? Math.abs(selectionRangeEndY - selectionRangeStartY)
    : 0;

  // Shift 키 의존 제거됨: 키 이벤트 핸들러 불필요

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
      <div className="relative flex-1 overflow-y-auto min-h-0 timeline-content">
        {/* Actions 툴바 - 항상 표시 */}
        <div className="flex border-b border-gray-700 bg-gray-900">
          <div className="w-48 flex-shrink-0 p-1 border-r border-gray-700 flex items-center justify-center">
            <span className="text-[10px] text-gray-400 font-medium">Actions</span>
          </div>
          <div className="flex-1 p-1 flex items-center gap-2 px-3">
            {/* Edit 버튼 - 텍스트와 사운드 클립에만 활성화 */}
            <button
              onClick={() => handleToolbarAction('edit')}
              disabled={!selectedClip || (selectedClipType !== 'text' && selectedClipType !== 'sound')}
              className={`px-3 py-1 rounded text-xs flex items-center gap-1.5 transition-colors ${
                selectedClip && (selectedClipType === 'text' || selectedClipType === 'sound')
                  ? 'bg-gray-800 hover:bg-gray-700 text-white'
                  : 'bg-gray-900 text-gray-500 cursor-not-allowed'
              }`}
              title={!selectedClip ? "Select a clip" : (selectedClipType === 'video' ? "Edit not available for video clips" : "Edit")}
            >
              <i className="ri-edit-line text-[11px]"></i>
              <span>Edit</span>
            </button>
            
            {/* Duplicate 버튼 */}
            <button
              onClick={() => handleToolbarAction('duplicate')}
              disabled={!selectedClip}
              className={`px-3 py-1 rounded text-xs flex items-center gap-1.5 transition-colors ${
                selectedClip
                  ? 'bg-gray-800 hover:bg-gray-700 text-white'
                  : 'bg-gray-900 text-gray-500 cursor-not-allowed'
              }`}
              title="Duplicate"
            >
              <i className="ri-file-copy-line text-[11px]"></i>
              <span>Duplicate</span>
            </button>
            
            {/* Split 버튼 */}
            <button
              onClick={() => handleToolbarAction('split')}
              disabled={!selectedClip || !canSplit()}
              className={`px-3 py-1 rounded text-xs flex items-center gap-1.5 transition-colors ${
                selectedClip && canSplit() 
                  ? 'bg-gray-800 hover:bg-gray-700 text-white' 
                  : 'bg-gray-900 text-gray-500 cursor-not-allowed'
              }`}
              title={!selectedClip ? "Select a clip" : !canSplit() ? "Move playhead inside clip" : "Split"}
            >
              <i className="ri-scissors-line text-[11px]"></i>
              <span>Split</span>
            </button>
            
            {/* Delete 버튼 */}
            <button
              onClick={() => handleToolbarAction('delete')}
              disabled={!selectedClip && rectSelectedClips.length === 0}
              className={`px-3 py-1 rounded text-xs flex items-center gap-1.5 transition-colors ${
                selectedClip || rectSelectedClips.length > 0
                  ? 'bg-red-900/50 hover:bg-red-800/50 text-red-400 hover:text-red-300'
                  : 'bg-gray-900 text-gray-500 cursor-not-allowed'
              }`}
              title={rectSelectedClips.length > 0 ? `Delete ${rectSelectedClips.length} selected` : 'Delete'}
            >
              <i className="ri-delete-bin-line text-[11px]"></i>
              <span>
                {rectSelectedClips.length > 0 ? `Delete (${rectSelectedClips.length})` : 'Delete'}
              </span>
            </button>
            
            {/* 선택된 클립 정보 표시 */}
            <div className="ml-auto text-[10px] text-gray-400">
              {rectSelectedClips.length > 0 ? (
                `${rectSelectedClips.length} selected`
              ) : selectedClip ? (
                `${selectedClipType === 'video' ? 'Video' : selectedClipType === 'text' ? 'Text' : 'Sound'} clip selected`
              ) : (
                'Select a clip or Shift+Drag to multi-select'
              )}
            </div>
          </div>
        </div>
        
        {/* 통합 스크롤 영역 시작 */}
        <div className="flex overflow-x-auto">
          {/* 왼쪽 고정 영역 */}
          <div className="flex-shrink-0 w-48">
            {/* Timeline 라벨 */}
            <div className="border-b border-r border-gray-700 p-1 h-8 flex items-center justify-center">
              <span className="text-[10px] text-gray-400 font-medium">Timeline</span>
            </div>
        
            {/* Video Track 라벨 */}
            <div className="border-b border-r border-gray-700 h-8 flex items-center justify-center px-2">
              <button 
                onClick={onAddClip}
                className="w-32 h-6 bg-black rounded flex items-center justify-center gap-1.5 hover:bg-gray-900 transition-colors group"
              >
                <i className="ri-add-line text-[13px] text-[#38f47cf9] group-hover:text-white"></i>
                <span className="text-[13px] text-[#38f47cf9] group-hover:text-white">Add Clip</span>
              </button>
            </div>
            {/* Text Track 라벨 */}
            <div className="border-b border-r border-gray-700 h-8 flex items-center justify-center px-2">
              <button 
                onClick={onAddText}
                className="w-32 h-6 bg-black rounded flex items-center justify-center gap-1.5 hover:bg-gray-900 transition-colors group"
              >
                <i className="ri-text text-[13px] text-[#38f47cf9] group-hover:text-white"></i>
                <span className="text-[13px] text-[#38f47cf9] group-hover:text-white">Add Text</span>
              </button>
            </div>

            {/* Sound Track 라벨 */}
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

          {/* 오른쪽 스크롤 영역 */}
          <div
            className="flex-1 relative"
            style={{ minWidth: `${timelineLength * pixelsPerSecond}px` }}
            ref={selectionContainerRef}
            onMouseDownCapture={handleSelectionMouseDown}
          >
            {/* Timeline 눈금 */}
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

            {/* Video Track */}
            <div className="border-b border-gray-700 h-8 flex items-center" onClick={handleTrackClick}>
              <div className="relative w-full h-5">
                {clips.map((clip) => {
                  const isRectSelected = rectSelectedClips.some(c => c.id === clip.id && c.type === 'video');
                  return (
                <div 
                  key={clip.id}
                  data-clip-id={clip.id}
                  data-clip-type="video"
                  className={`group absolute top-0 timeline-clip ${
                    isRectSelected
                      ? 'ring-2 ring-red-400 rounded'
                      : selectedClip === clip.id
                        ? 'ring-2 ring-[#38f47cf9] rounded'
                        : ''
                  }`}
                  style={{ 
                    width: `${clip.duration}px`,
                    left: `${clip.position}px`
                  }}
                  onClick={() => handleClipClick(clip.id, 'video')}
                  onMouseDown={(e) => {
                    if (e.shiftKey || isSelectingRange) return;
                    if (!(e.target as HTMLElement).classList.contains('resize-handle')) {
                      setIsDragging(true);
                      setActiveClip(clip.id);
                      setActiveClipType('video');
                      setInitialDragX(e.clientX);
                      setDragStartX(e.clientX);
                      handleClipClick(clip.id, 'video');
                    }
                  }}
                >
                  <div 
                    className="w-full h-5 bg-gradient-to-r from-gray-900 to-gray-800 rounded cursor-pointer hover:from-gray-800 hover:to-gray-700 transition-colors relative overflow-hidden border border-gray-700"
                    onMouseDown={(e) => handleMouseDown(e, clip.id, 'video')}
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
              );})}
              </div>
            </div>

            {/* Text Track */}
            <div className="border-b border-gray-700 h-8 flex items-center" onClick={handleTrackClick}>
              <div className="relative w-full h-5">
              {textClips.map((clip) => {
                const isRectSelected = rectSelectedClips.some(c => c.id === clip.id && c.type === 'text');
                return (
                <div
                  key={clip.id}
                  data-clip-id={clip.id}
                  data-clip-type="text"
                  className={`timeline-clip absolute top-0 ${
                    isRectSelected
                      ? 'ring-2 ring-red-400 rounded'
                      : selectedClip === clip.id
                        ? 'ring-2 ring-[#38f47cf9] rounded'
                        : ''
                  }`}
                  style={{ 
                    width: `${clip.duration}px`,
                    left: `${clip.position}px`
                  }}
                  onClick={() => handleClipClick(clip.id, 'text')}
                  onMouseDown={(e) => {
                    if (e.shiftKey || isSelectingRange) return;
                    if (!(e.target as HTMLElement).classList.contains('resize-handle')) {
                      setIsDragging(true);
                      setActiveClip(clip.id);
                      setActiveClipType('text');
                      setInitialDragX(e.clientX);
                      setDragStartX(e.clientX);
                      handleClipClick(clip.id, 'text');
                    }
                  }}
                >
                  <TextClip
                    clip={clip}
                    onEdit={onEditTextClip}
                    onDelete={onDeleteTextClip}
                    onResizeStart={(e, handle) => handleResizeStart(e, clip.id, handle, 'text')}
                    isActive={activeClip === clip.id}
                  />
                </div>
              );})}
              </div>
            </div>

            {/* Sound Track */}
            <div className="h-8 flex items-center" onClick={handleTrackClick}>
              <div className="relative w-full h-5">
              {soundClips.map((clip) => {
                const isRectSelected = rectSelectedClips.some(c => c.id === clip.id && c.type === 'sound');
                return (
                <div
                  key={clip.id}
                  data-clip-id={clip.id}
                  data-clip-type="sound"
                  className={`timeline-clip absolute top-0 ${
                    isRectSelected
                      ? 'ring-2 ring-red-400 rounded'
                      : selectedClip === clip.id
                        ? 'ring-2 ring-[#38f47cf9] rounded'
                        : ''
                  }`}
                  style={{ 
                    width: `${clip.duration}px`,
                    left: `${clip.position}px`
                  }}
                  onClick={() => handleClipClick(clip.id, 'sound')}
                  onMouseDown={(e) => {
                    if (e.shiftKey || isSelectingRange) return;
                    if (!(e.target as HTMLElement).classList.contains('resize-handle')) {
                      setIsDragging(true);
                      setActiveClip(clip.id);
                      setActiveClipType('sound');
                      setInitialDragX(e.clientX);
                      setDragStartX(e.clientX);
                      handleClipClick(clip.id, 'sound');
                    }
                  }}
                >
                  <SoundClip
                    clip={clip}
                    onEdit={onEditSoundClip}
                    onDelete={onDeleteSoundClip}
                    onResizeStart={(e, handle) => handleResizeStart(e, clip.id, handle, 'sound')}
                    isActive={activeClip === clip.id}
                    pixelsPerSecond={pixelsPerSecond}
                  />
                </div>
              );})}
              </div>
            </div>

            {/* Shift + 드래그 선택 박스 (드래깅 중) */}
            {isSelectingRange && selectionStartX !== null && selectionCurrentX !== null && selectionStartY !== null && selectionCurrentY !== null && (
              <div
                className="absolute bg-red-500/20 border border-red-400/60 pointer-events-none"
                style={{ left: `${selectingLeft}px`, top: `${selectingTop}px`, width: `${selectingWidth}px`, height: `${selectingHeight}px`, zIndex: 40 }}
              />
            )}

            {/* 활성 선택 영역 (마우스 업 후 유지) */}
            {isRangeActive && selectionRangeStartX !== null && selectionRangeEndX !== null && selectionRangeStartY !== null && selectionRangeEndY !== null && (
              <div
                className="absolute bg-red-500/10 border border-red-400"
                style={{ left: `${activeSelectionLeft}px`, top: `${activeSelectionTop}px`, width: `${activeSelectionWidth}px`, height: `${activeSelectionHeight}px`, zIndex: 41 }}
                onMouseDown={startMoveSelection}
              >
                {/* 좌측 리사이즈 핸들 */}
                <div
                  className="absolute inset-y-0 left-0 w-1 bg-red-400 cursor-ew-resize"
                  onMouseDown={(e) => startAdjustSelection(e, 'left')}
                />
                {/* 우측 리사이즈 핸들 */}
                <div
                  className="absolute inset-y-0 right-0 w-1 bg-red-400 cursor-ew-resize"
                  onMouseDown={(e) => startAdjustSelection(e, 'right')}
                />
                {/* 상단 리사이즈 핸들 */}
                <div
                  className="absolute inset-x-0 top-0 h-1 bg-red-400 cursor-ns-resize"
                  onMouseDown={(e) => startAdjustSelection(e, 'top')}
                />
                {/* 하단 리사이즈 핸들 */}
                <div
                  className="absolute inset-x-0 bottom-0 h-1 bg-red-400 cursor-ns-resize"
                  onMouseDown={(e) => startAdjustSelection(e, 'bottom')}
                />
              </div>
            )}

            {/* 통합 플레이헤드 - Timeline부터 시작 */}
            <div
              ref={playheadRef}
              className="absolute"
              style={{
                top: '0', // 타임라인 눈금부터 시작
                bottom: '0',
                left: `${playheadPosition}px`,
                zIndex: 50,
                width: '13px', // 드래그 가능한 영역 너빔
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
      </div>

    </div>
  );
}