'use client';

import { useState, useEffect, useRef } from 'react';
import { VideoClip as VideoClipType, TextClip as TextClipType, SoundClip as SoundClipType } from '@/types/video-editor';
import { validateClipDuration, getTimelineEnd } from '../_utils/timeline-utils';
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

  const handleMouseDown = (e: React.MouseEvent, clipId: string, clipType: 'video' | 'text' | 'sound') => {
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

  // 클립 클릭으로 선택 처리
  const handleClipClick = (clipId: string, clipType: 'video' | 'text' | 'sound') => {
    setSelectedClip(clipId);
    setSelectedClipType(clipType);
  };

  // 툴바 액션 핸들러
  const handleToolbarAction = (action: 'edit' | 'duplicate' | 'split' | 'delete') => {
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
    e.stopPropagation();
    e.preventDefault(); // 이벤트 전파 방지
    console.log('🔧 리사이즈 시작:', { clipId, handle, clipType, clientX: e.clientX });
    setIsResizing(true);
    setResizeHandle(handle);
    setActiveClip(clipId);
    setActiveClipType(clipType);
    setDragStartX(e.clientX);
    setResizeMoved(false);
    console.log('🔧 resizeMoved 초기화: false');
    
    // 현재 클립의 duration과 position 값을 가져와서 저장
    if (clipType === 'video') {
      const clip = clips.find(c => c.id === clipId);
      setStartWidth(clip?.duration || 200);
      setStartPosition(clip?.position || 0);
    } else if (clipType === 'text') {
      const clip = textClips.find(c => c.id === clipId);
      setStartWidth(clip?.duration || 200);
      setStartPosition(clip?.position || 0);
    } else if (clipType === 'sound') {
      const clip = soundClips.find(c => c.id === clipId);
      setStartWidth(clip?.duration || 200);
      setStartPosition(clip?.position || 0);
    }
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!activeClip) return;

      if (isResizing) {
        const delta = e.clientX - dragStartX;
        const moveDistance = Math.abs(delta);
        
        console.log('🎯 마우스 이동:', { 
          delta, 
          moveDistance, 
          resizeMoved, 
          threshold: RESIZE_ACTIVATION_DELTA,
          willActivate: moveDistance > RESIZE_ACTIVATION_DELTA 
        });

        // 아직 resizeMoved가 false이고, 움직인 거리가 임계값을 넘으면 true로 설정
        if (!resizeMoved && moveDistance > RESIZE_ACTIVATION_DELTA) {
          console.log('✅ 리사이즈 활성화! moveDistance:', moveDistance);
          setResizeMoved(true);
        }

        let newWidth = startWidth;
        let newPosition = startPosition;

        if (resizeHandle === 'left') {
          // 왼쪽 핸들: 양방향 리사이즈 가능 (원본 범위 내에서)
          // delta < 0: 왼쪽으로 확장, delta > 0: 오른쪽으로 축소
          newPosition = Math.max(0, startPosition + delta);
          newWidth = startWidth + (startPosition - newPosition);
          
          // 최소 너비 체크
          if (newWidth < 80) {
            newWidth = 80;
            newPosition = startPosition + startWidth - 80;
          }
          
          // 원본 시작점을 넘어서 확장하지 않도록 제한
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
        } else {
          // 오른쪽 핸들: 양방향 리사이즈 가능 (원본 범위 내에서)
          // delta > 0: 오른쪽으로 확장, delta < 0: 왼쪽으로 축소
          newWidth = Math.max(80, startWidth + delta);
          
          // 원본 끝점을 넘어서 확장하지 않도록 제한
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
        }

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

        // DOM 업데이트
        const clipElement = document.querySelector(`[data-clip-id="${activeClip}"]`) as HTMLElement;
        if (clipElement) {
          clipElement.style.width = `${newWidth}px`;
          if (resizeHandle === 'left') {
            clipElement.style.left = `${newPosition}px`;
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
          import('../_utils/timeline-utils').then(({ magneticPositioning }) => {
            // Handle position update for all clip types
            if (activeClipType === 'video' && onUpdateAllVideoClips) {
              const currentClip = clips.find(c => c.id === activeClip);
              if (currentClip) {
                const newPosition = Math.max(0, currentClip.position + delta);
                
                // Use magnetic positioning to prevent overlaps and push clips
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
            } else if (activeClipType === 'text' && onUpdateAllTextClips) {
              const currentClip = textClips.find(c => c.id === activeClip);
              if (currentClip) {
                const newPosition = Math.max(0, currentClip.position + delta);
                
                // Use magnetic positioning to prevent overlaps and push clips
                const { targetPosition, adjustedClips } = magneticPositioning(
                  textClips,
                  activeClip,
                  newPosition,
                  currentClip.duration
                );
                
                
                // Update all clips including the dragged one
                const updatedClips = [
                  ...adjustedClips,
                  { ...currentClip, position: targetPosition }
                ].sort((a, b) => a.position - b.position);
                
                onUpdateAllTextClips(updatedClips);
              }
            } else if (activeClipType === 'sound' && onUpdateAllSoundClips) {
              const currentClip = soundClips.find(c => c.id === activeClip);
              if (currentClip) {
                const newPosition = Math.max(0, currentClip.position + delta);
                
                // Use magnetic positioning to prevent overlaps and push clips
                const { targetPosition, adjustedClips } = magneticPositioning(
                  soundClips,
                  activeClip,
                  newPosition,
                  currentClip.duration
                );
                
                
                // Update all clips including the dragged one
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
        // 리사이징 종료 시, 실제 duration과 position을 업데이트
        if (clipElement && isResizing) {
          console.log('🏁 리사이즈 종료:', { resizeMoved, isResizing, activeClip });
          
          // 클릭만 했다가 놓은 경우: 원래 값으로 복원
          if (!resizeMoved) {
            console.log('❌ 리사이즈 취소 (단순 클릭으로 판단)');
            
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
            
            console.log('🔄 원래 값으로 복원:', { originalPosition, originalDuration });
            clipElement.style.left = `${originalPosition}px`;
            clipElement.style.width = `${originalDuration}px`;
          } else {
            console.log('✅ 리사이즈 적용');
            const finalWidth = clipElement.offsetWidth;
            // 왼쪽 핸들로 리사이즈한 경우에만 position 변경
            const finalPosition = resizeHandle === 'left' 
              ? (parseFloat(clipElement.style.left) || startPosition)
              : startPosition;
            
            if (activeClipType === 'video') {
              const clipData = clips.find(c => c.id === activeClip);
              const maxPx = clipData?.maxDuration ?? Infinity;
              const startSeconds = clipData?.startTime || 0;
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

            // 스타일 리셋: 상태 반영 후 인라인 스타일은 초기화
            // 오른쪽 핸들일 때는 left 스타일 유지 (position 변경 없으므로)
            if (resizeHandle === 'left') {
              console.log('🔄 왼쪽 핸들: left 스타일 초기화');
              clipElement.style.left = '';
            } else {
              console.log('🔄 오른쪽 핸들: left 스타일 유지');
            }
            clipElement.style.width = '';
          }
        }
      }
      console.log('🔚 모든 상태 리셋');
      setActiveClip(null);
      setActiveClipType(null);
      setIsDragging(false);
      setIsResizing(false);
      setResizeHandle(null);
      setResizeMoved(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [activeClip, activeClipType, isDragging, isResizing, dragStartX, startWidth, startPosition, resizeHandle, clips, textClips, soundClips, onResizeVideoClip, onResizeTextClip, onResizeSoundClip, onUpdateVideoClipPosition, onUpdateTextClipPosition, onUpdateSoundClipPosition, onUpdateAllVideoClips, onUpdateAllTextClips, onUpdateAllSoundClips, pixelsPerSecond, dragDirection, initialDragX, resizeMoved]);

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

  // 클립 트랙 영역 클릭으로 seek
  const handleTrackClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // 클립 자체를 클릭한 경우는 무시
    if ((e.target as HTMLElement).closest('.timeline-clip')) return;
    
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
              disabled={!selectedClip}
              className={`px-3 py-1 rounded text-xs flex items-center gap-1.5 transition-colors ${
                selectedClip
                  ? 'bg-red-900/50 hover:bg-red-800/50 text-red-400 hover:text-red-300'
                  : 'bg-gray-900 text-gray-500 cursor-not-allowed'
              }`}
              title="Delete"
            >
              <i className="ri-delete-bin-line text-[11px]"></i>
              <span>Delete</span>
            </button>
            
            {/* 선택된 클립 정보 표시 */}
            <div className="ml-auto text-[10px] text-gray-400">
              {selectedClip ? (
                <>
                  {selectedClipType === 'video' && 'Video clip'}
                  {selectedClipType === 'text' && 'Text clip'}
                  {selectedClipType === 'sound' && 'Sound clip'}
                  {' selected'}
                </>
              ) : (
                'Select a clip'
              )}
            </div>
          </div>
        </div>
        
        {/* Timeline - 시간 눈금 */}
        <div className="flex border-b border-gray-700">
          <div className="w-48 flex-shrink-0 p-1 border-r border-gray-700 flex items-center justify-center">
            <span className="text-[10px] text-gray-400 font-medium">Timeline</span>
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
          <div className="flex-1 p-1 overflow-x-auto" onClick={handleTrackClick}>
            <div className="relative min-h-[24px]">
              {clips.map((clip) => (
                <div 
                  key={clip.id}
                  data-clip-id={clip.id}
                  className={`group absolute top-0 timeline-clip ${
                    selectedClip === clip.id ? 'ring-2 ring-[#38f47cf9] rounded' : ''
                  }`}
                  style={{ 
                    width: `${clip.duration}px`,
                    left: `${clip.position}px`
                  }}
                  onClick={() => handleClipClick(clip.id, 'video')}
                  onMouseDown={(e) => {
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
          <div className="flex-1 p-1 overflow-x-auto" onClick={handleTrackClick}>
            <div className="relative min-h-[24px]">
              {textClips.map((clip) => (
                <div
                  key={clip.id}
                  data-clip-id={clip.id}
                  className={`timeline-clip absolute top-0 ${
                    selectedClip === clip.id ? 'ring-2 ring-[#38f47cf9] rounded' : ''
                  }`}
                  style={{ 
                    width: `${clip.duration}px`,
                    left: `${clip.position}px`
                  }}
                  onClick={() => handleClipClick(clip.id, 'text')}
                  onMouseDown={(e) => {
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
          <div className="flex-1 p-1 overflow-x-auto" onClick={handleTrackClick}>
            <div className="relative min-h-[24px]">
              {soundClips.map((clip) => (
                <div
                  key={clip.id}
                  data-clip-id={clip.id}
                  className={`timeline-clip absolute top-0 ${
                    selectedClip === clip.id ? 'ring-2 ring-[#38f47cf9] rounded' : ''
                  }`}
                  style={{ 
                    width: `${clip.duration}px`,
                    left: `${clip.position}px`
                  }}
                  onClick={() => handleClipClick(clip.id, 'sound')}
                  onMouseDown={(e) => {
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
              ))}
            </div>
          </div>
        </div>
        {/* 통합 플레이헤드 - Timeline부터 시작 */}
        <div
          ref={playheadRef}
          className="absolute bottom-0"
          style={{
            top: '32px', // Actions 툴바(32px) 아래부터 시작
            left: `calc(12rem + ${playheadPosition}px + 8px - 6px)`, // 12rem = w-48, 8px = padding, -6px = 드래그 영역 중앙
            zIndex: 50,
            width: '13px', // 드래그 가능한 영역 너비
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