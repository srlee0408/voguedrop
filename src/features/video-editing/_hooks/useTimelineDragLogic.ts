'use client';

/**
 * useTimelineDragLogic - 타임라인 드래그 상호작용 관리 커스텀 훅 🖱️
 * 
 * 📌 주요 역할:
 * 1. 클립 드래그/리사이즈 상호작용 처리
 * 2. 레인 타겟팅 및 고스트 프리뷰 로직  
 * 3. 다중 선택 클립 드래그 처리
 * 4. 겹침 검사 및 교체 모드 확인
 * 5. 새 레인 드롭존 감지 및 생성
 * 6. 재생헤드 드래그 및 위치 감지
 * 
 * 🎯 핵심 특징:
 * - 복잡한 레인 감지 로직을 DOM 기반으로 정확하게 처리
 * - 드래그 중 실시간 타겟 레인 및 고스트 프리뷰 계산
 * - 겹침 임계치(30%) 기반 교체 모드 자동 감지
 * - 다중 선택과 단일 드래그의 통합 처리
 * - 마우스 근접 감지(8px)로 정확한 재생헤드 드래그 시작
 * 
 * 🚧 복잡도 경고:
 * - 이 훅은 948줄의 복잡한 로직을 포함함
 * - 드래그 & 드롭의 모든 케이스를 처리하는 핵심 컴포넌트
 * - 수정 시 신중히 접근 필요 (사이드 이펙트 주의)
 * 
 * 💡 사용법:
 * ```tsx
 * const dragLogic = useTimelineDragLogic({
 *   clips, textClips, soundClips,
 *   videoLanes, textLanes, soundLanes,
 *   pixelsPerSecond: 40,
 *   currentTime: 30,
 *   // ... 기타 핸들러들
 * });
 * 
 * return (
 *   <div
 *     onMouseDown={dragLogic.handleMouseDown}
 *     onMouseMove={dragLogic.handleMouseMove}
 *     onMouseUp={dragLogic.handleMouseUp}
 *   >
 * ```
 */

import { useCallback, useEffect } from 'react';
import { VideoClip, TextClip, SoundClip } from '@/shared/types/video-editor';
import { useSelectionState } from '@/features/video-editing/_hooks/useSelectionState';
import { useDragAndDrop } from '@/features/video-editing/_hooks/useDragAndDrop';
import { 
  getVideoClipsForLane, 
  getTextClipsForLane, 
  getClipsForLane, 
  canAddNewVideoLane, 
  canAddNewTextLane, 
  canAddNewLane 
} from '@/features/video-editing/_utils/lane-arrangement';
import { 
  getMaxOverlapRatio, 
  getMaxOverlapTarget, 
  magneticPositioning, 
  OVERLAP_REPLACE_THRESHOLD 
} from '@/features/video-editing/_utils/common-clip-utils';

/**
 * useTimelineDragLogic 훅 옵션 인터페이스 🎛️
 * 
 * 📋 옵션 그룹별 설명:
 * 
 * 📦 **클립 데이터**: 각 타입별 클립 배열들
 * 🛤️ **레인 정보**: 활성 레인 인덱스 배열들  
 * ⚙️ **타임라인 설정**: 줌, 시간, 길이 등 기본 설정
 * 🎯 **상태 관리**: 활성 클립 및 드래그 상태
 * 🖱️ **마우스 추적**: 위치 및 타겟 레인 상태
 * 🎮 **사용자 인터랙션**: 선택, 재생헤드 등
 * 🔄 **콜백 함수들**: 클립 조작 이벤트 핸들러들
 */
interface UseTimelineDragLogicOptions {
  // 📦 클립 데이터 - 드래그 대상이 되는 모든 클립들
  /** 📹 비디오 클립 배열 */
  clips: VideoClip[];
  /** 📝 텍스트 클립 배열 */
  textClips: TextClip[];
  /** 🔊 사운드 클립 배열 */
  soundClips: SoundClip[];
  
  // 🛤️ 레인 정보 - 각 타입별 활성 레인들
  /** 🛤️ 활성 비디오 레인 인덱스들 */
  videoLanes: number[];
  /** 🛤️ 활성 텍스트 레인 인덱스들 */
  textLanes: number[];
  /** 🛤️ 활성 사운드 레인 인덱스들 */
  soundLanes: number[];
  
  // ⚙️ 타임라인 기본 설정
  /** 📏 줌 레벨 (픽셀/초) */
  pixelsPerSecond: number;
  /** 현재 재생 시간 (초) */
  currentTime: number;
  /** ⏱️ 실제 컨텐츠 총 길이 (초) */
  totalDurationInSeconds: number;
  /** 📐 타임라인 표시 길이 (초) */
  timelineLengthInSeconds: number;
  
  // 상태 관리
  activeClip: string | null;
  activeClipType: 'video' | 'text' | 'sound' | null;
  setActiveClipInfo: (clipId: string | null, clipType: 'video' | 'text' | 'sound' | null) => void;
  
  // 드래그 타겟 상태
  dragTargetLane: { laneIndex: number; laneType: 'video' | 'text' | 'sound' } | null;
  setDragTargetLane: (lane: { laneIndex: number; laneType: 'video' | 'text' | 'sound' } | null) => void;
  lastHoverLane: { laneIndex: number; laneType: 'video' | 'text' | 'sound' } | null;
  setLastHoverLane: (lane: { laneIndex: number; laneType: 'video' | 'text' | 'sound' } | null) => void;
  latestValidLaneRef: React.MutableRefObject<{ laneIndex: number; laneType: 'video' | 'text' | 'sound' } | null>;
  
  // 마우스 위치
  lastMouseX: number | null;
  setLastMouseX: (x: number | null) => void;
  lastMouseY: number | null;
  setLastMouseY: (y: number | null) => void;
  newLaneTargetType: 'video' | 'text' | 'sound' | null;
  setNewLaneTargetType: (type: 'video' | 'text' | 'sound' | null) => void;
  
  // 선택 상태
  selectedClip: string | null;
  selectedClipType: 'video' | 'text' | 'sound' | null;
  rectSelectedClips: Array<{id: string; type: 'video' | 'text' | 'sound'}>;
  selectClip: (clipId: string, clipType: 'video' | 'text' | 'sound') => void;
  clearSelection: () => void;
  setRectSelectedClips: (clips: Array<{id: string; type: 'video' | 'text' | 'sound'}>) => void;
  
  // 재생헤드 드래그
  isDraggingPlayhead: boolean;
  setIsDraggingPlayhead: (dragging: boolean) => void;
  
  // 사용자 선호도
  askReplaceOnOverlap: () => Promise<boolean>;
  
  // 콜백 함수들
  onSeek?: (time: number) => void;
  onAddVideoLane?: () => void;
  onAddTextLane?: () => void;
  onAddSoundLane?: () => void;
  onUpdateVideoClipPosition?: (id: string, newPosition: number) => void;
  onUpdateTextClipPosition?: (id: string, newPosition: number) => void;
  onUpdateSoundClipPosition?: (id: string, newPosition: number) => void;
  onResizeVideoClip?: (id: string, newDuration: number, handle?: 'left' | 'right', deltaPosition?: number) => void;
  onResizeTextClip?: (id: string, newDuration: number) => void;
  onResizeSoundClip?: (id: string, newDuration: number, handle?: 'left' | 'right', deltaPosition?: number) => void;
  onUpdateAllVideoClips?: (clips: VideoClip[]) => void;
  onUpdateAllTextClips?: (clips: TextClip[]) => void;
  onUpdateAllSoundClips?: (clips: SoundClip[]) => void;
  onReorderVideoClips?: (clips: VideoClip[]) => void;
  onReorderTextClips?: (clips: TextClip[]) => void;
  onReorderSoundClips?: (clips: SoundClip[]) => void;
}

interface UseTimelineDragLogicReturn {
  // 이벤트 핸들러들
  handleMouseDown: (e: React.MouseEvent, clipId: string, clipType: 'video' | 'text' | 'sound') => void;
  handleResizeStart: (e: React.MouseEvent, clipId: string, handle: 'left' | 'right', clipType?: 'video' | 'text' | 'sound') => void;
  handleTimelineClick: (e: React.MouseEvent<HTMLDivElement>) => void;
  handleTrackClick: (e: React.MouseEvent<HTMLDivElement>) => void;
  handlePlayheadMouseDown: (e: React.MouseEvent) => void;
  handleSelectionMouseDown: (e: React.MouseEvent<HTMLDivElement>) => void;
  
  // 유틸리티 함수들
  isNearPlayhead: (clientX: number) => boolean;
  detectTargetLane: (clientY: number, clipType: 'video' | 'text' | 'sound') => { laneIndex: number; laneType: 'video' | 'text' | 'sound' } | null;
  detectNewLaneDropzone: (clientY: number, clipType: 'video' | 'text' | 'sound') => 'video' | 'text' | 'sound' | null;
  findNearestLaneAtY: (clientY: number, clipType: 'video' | 'text' | 'sound') => { laneIndex: number; laneType: 'video' | 'text' | 'sound' } | null;
  
  // 고스트 프리뷰 계산
  getGhostPreviewForLane: (laneType: 'video' | 'text' | 'sound', laneIndex: number) => { left: number; width: number } | null;
  isGhostReplacingForLane: (laneType: 'video' | 'text' | 'sound', laneIndex: number) => boolean;
  getGhostReplaceTargetIdForLane: (laneType: 'video' | 'text' | 'sound', laneIndex: number) => string | null;
  
  // 선택 영역 업데이트
  updateRectSelectedClips: (left: number, right: number, top: number, bottom: number) => void;
}

/**
 * 타임라인 드래그 로직 관리 훅
 * 복잡한 드래그 상호작용을 체계적으로 관리
 */
export function useTimelineDragLogic(options: UseTimelineDragLogicOptions): UseTimelineDragLogicReturn {
  const {
    clips,
    textClips,
    soundClips,
    videoLanes,
    textLanes,
    soundLanes,
    pixelsPerSecond,
    currentTime,
    totalDurationInSeconds,
    activeClip,
    activeClipType,
    setActiveClipInfo,
    dragTargetLane,
    setDragTargetLane,
    lastHoverLane,
    setLastHoverLane,
    latestValidLaneRef,
    lastMouseX,
    setLastMouseX,
    lastMouseY,
    setLastMouseY,
    newLaneTargetType,
    setNewLaneTargetType,
    rectSelectedClips,
    selectClip,
    clearSelection,
    setRectSelectedClips,
    setIsDraggingPlayhead,
    onSeek,
    onAddVideoLane,
    onAddTextLane,
    onAddSoundLane,
  } = options;
  
  // 드래그 앤 드롭 훅
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
    startDrag,
    startResize,
    resetDragState,
    updateDragDirection,
    checkResizeActivation,
    setFinalResizeWidth,
    setFinalResizePosition,
  } = useDragAndDrop();
  
  // 선택 상태 훅
  const {
    selectionContainerRef,
    isSelectingRange,
    isAdjustingSelection,
    isMovingSelection,
    startSelection,
  } = useSelectionState();
  
  /**
   * 재생헤드 근접 감지 (8픽셀 이내)
   */
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
  
  /**
   * 타겟 레인 감지 (DOM 기반)
   */
  const detectTargetLane = useCallback((clientY: number, clipType: 'video' | 'text' | 'sound'): { laneIndex: number, laneType: 'video' | 'text' | 'sound' } | null => {
    const container = selectionContainerRef.current;
    if (!container) {
      return null;
    }
    
    // DOM 기반 레인 감지: 실제 클릭 가능한 클립 영역으로 정확히 판단
    const clipAreas = container.querySelectorAll<HTMLElement>(`[data-clip-area-track-type="${clipType}"]`);
    
    // 1. 먼저 정확한 클립 영역 내에 있는지 확인
    for (const clipArea of Array.from(clipAreas)) {
      const r = clipArea.getBoundingClientRect();
      
      if (clientY >= r.top && clientY <= r.bottom) {
        const laneIdAttr = clipArea.getAttribute('data-clip-area-lane-id');
        const laneIndex = laneIdAttr ? parseInt(laneIdAttr, 10) : NaN;
        if (!Number.isNaN(laneIndex)) {
          return { laneIndex, laneType: clipType };
        }
      }
    }
    
    // 2. 클립 영역에서 찾지 못했다면 기존 방식으로도 시도 (대안)
    const tracks = container.querySelectorAll<HTMLElement>(`[data-track-type="${clipType}"]`);
    
    for (const track of Array.from(tracks)) {
      const r = track.getBoundingClientRect();
      // 트랙의 중앙 60% 영역만 감지 (더 정확한 매칭)
      const centerMargin = (r.bottom - r.top) * 0.2; // 상하 20%씩 마진
      const adjustedTop = r.top + centerMargin;
      const adjustedBottom = r.bottom - centerMargin;
      
      if (clientY >= adjustedTop && clientY <= adjustedBottom) {
        const laneIdAttr = track.getAttribute('data-lane-id');
        const laneIndex = laneIdAttr ? parseInt(laneIdAttr, 10) : NaN;
        if (!Number.isNaN(laneIndex)) {
          return { laneIndex, laneType: clipType };
        }
      }
    }
    
    return null;
  }, [selectionContainerRef]);
  
  /**
   * 새 레인 드롭존 감지 (각 섹션 하단 24px 영역)
   */
  const detectNewLaneDropzone = useCallback((clientY: number, clipType: 'video' | 'text' | 'sound'): 'video' | 'text' | 'sound' | null => {
    const container = selectionContainerRef.current;
    if (!container) {
      return null;
    }
    const rect = container.getBoundingClientRect();
    const y = clientY - rect.top;
    
    // 섹션 및 높이 설정 (ruler height = 32px)
    const headerHeight = 32;
    const videoTrackHeight = 32;
    const textTrackHeight = 32;
    const soundTrackHeight = 48;
    
    let currentY = headerHeight; // ruler 포함
    
    // 비디오 섹션
    const videoSectionHeight = videoLanes.length * videoTrackHeight;
    if (clipType === 'video') {
      const dropzoneTop = currentY + videoSectionHeight;
      const dropzoneBottom = dropzoneTop + 24;
      
      if (y >= dropzoneTop && y <= dropzoneBottom) return 'video';
    }
    currentY += videoSectionHeight;
    
    // 텍스트 섹션
    const textSectionHeight = textLanes.length * textTrackHeight;
    if (clipType === 'text') {
      const dropzoneTop = currentY + textSectionHeight;
      const dropzoneBottom = dropzoneTop + 24;
      
      if (y >= dropzoneTop && y <= dropzoneBottom) return 'text';
    }
    currentY += textSectionHeight;
    
    // 사운드 섹션
    const soundSectionHeight = soundLanes.length * soundTrackHeight;
    if (clipType === 'sound') {
      const dropzoneTop = currentY + soundSectionHeight;
      const dropzoneBottom = dropzoneTop + 24;
      
      if (y >= dropzoneTop && y <= dropzoneBottom) return 'sound';
    }
    
    return null;
  }, [soundLanes, textLanes, videoLanes, selectionContainerRef]);
  
  /**
   * 주어진 Y좌표에서 가장 가까운 레인 찾기 (동일 타입)
   */
  const findNearestLaneAtY = useCallback((clientY: number, clipType: 'video' | 'text' | 'sound'): { laneIndex: number; laneType: 'video' | 'text' | 'sound' } | null => {
    const container = selectionContainerRef.current;
    if (!container) return null;
    const clipAreas = container.querySelectorAll<HTMLElement>(`[data-clip-area-track-type="${clipType}"]`);
    let bestCandidate: { laneIndex: number; dist: number } | undefined;
    Array.from(clipAreas).forEach(clipArea => {
      const r = clipArea.getBoundingClientRect();
      const centerY = (r.top + r.bottom) / 2;
      const dist = Math.abs(clientY - centerY);
      const laneAttr = clipArea.getAttribute('data-clip-area-lane-id');
      const laneIdx = laneAttr ? parseInt(laneAttr, 10) : NaN;
      if (!Number.isNaN(laneIdx)) {
        if (!bestCandidate || dist < bestCandidate.dist) {
          bestCandidate = { laneIndex: laneIdx, dist };
        }
      }
    });
    if (bestCandidate) {
      return { laneIndex: bestCandidate.laneIndex, laneType: clipType as 'video' | 'text' | 'sound' };
    }
    return null;
  }, [selectionContainerRef]);
  
  /**
   * 드래그 고스트 프리뷰 계산 (단순 요청 위치 기준 - 실제 드롭 시 자석 배치 적용)
   */
  const getGhostPreviewForLane = useCallback((
    laneType: 'video' | 'text' | 'sound',
    laneIndex: number
  ): { left: number; width: number } | null => {
    if (!isDragging || !activeClip || !activeClipType) return null;
    if (activeClipType !== laneType) return null;
    if (!dragTargetLane || dragTargetLane.laneType !== laneType || dragTargetLane.laneIndex !== laneIndex) return null;
    
    // 현재 드래그 델타 계산
    const deltaScreenPx = (lastMouseX ?? dragStartX) - dragStartX;
    const zoomRatio = pixelsPerSecond / 40; // 화면(px) → 내부 기준(px) 변환
    const deltaBasePx = deltaScreenPx / zoomRatio;
    
    // 활성 클립 데이터 추출
    let currentPosition = 0;
    let currentDuration = 120; // fallback width
    if (activeClipType === 'video') {
      const clip = clips.find(c => c.id === activeClip);
      currentPosition = clip?.position ?? 0;
      currentDuration = clip?.duration ?? 120;
    } else if (activeClipType === 'text') {
      const clip = textClips.find(c => c.id === activeClip);
      currentPosition = clip?.position ?? 0;
      currentDuration = clip?.duration ?? 120;
    } else if (activeClipType === 'sound') {
      const clip = soundClips.find(c => c.id === activeClip);
      currentPosition = clip?.position ?? 0;
      currentDuration = clip?.duration ?? 120;
    }
    
    const requestedPosition = Math.max(0, currentPosition + deltaBasePx);
    
    // 대상 레인의 클립 목록 수집
    let laneClips: Array<{ id: string; position: number; duration: number }> = [];
    if (laneType === 'video') {
      laneClips = getVideoClipsForLane(clips, laneIndex) as Array<{ id: string; position: number; duration: number }>;
    } else if (laneType === 'text') {
      laneClips = getTextClipsForLane(textClips, laneIndex) as Array<{ id: string; position: number; duration: number }>;
    } else if (laneType === 'sound') {
      laneClips = getClipsForLane(soundClips, laneIndex) as Array<{ id: string; position: number; duration: number }>;
    }
    
    // 겹침 비율 확인 (threshold 이상이면 교체 모드 프리뷰)
    const { maxRatio } = getMaxOverlapRatio(
      laneClips,
      activeClip,
      requestedPosition,
      currentDuration
    );
    
    if (maxRatio >= OVERLAP_REPLACE_THRESHOLD) {
      return { left: requestedPosition, width: currentDuration };
    }
    
    // 겹침이 없으면 자석 배치 프리뷰
    const { targetPosition } = magneticPositioning(
      laneClips,
      activeClip,
      requestedPosition,
      currentDuration
    );
    
    return { left: targetPosition, width: currentDuration };
  }, [isDragging, activeClip, activeClipType, dragTargetLane, lastMouseX, dragStartX, pixelsPerSecond, clips, textClips, soundClips]);
  
  /**
   * 드래그 프리뷰가 교체 동작인지 여부
   */
  const isGhostReplacingForLane = useCallback((
    laneType: 'video' | 'text' | 'sound',
    laneIndex: number
  ): boolean => {
    if (!isDragging || !activeClip || !activeClipType) return false;
    if (activeClipType !== laneType) return false;
    if (!dragTargetLane || dragTargetLane.laneType !== laneType || dragTargetLane.laneIndex !== laneIndex) return false;
    
    const deltaScreenPx = (lastMouseX ?? dragStartX) - dragStartX;
    const zoomRatio = pixelsPerSecond / 40;
    const deltaBasePx = deltaScreenPx / zoomRatio;
    
    let currentPosition = 0;
    let currentDuration = 120;
    if (activeClipType === 'video') {
      const clip = clips.find(c => c.id === activeClip);
      currentPosition = clip?.position ?? 0;
      currentDuration = clip?.duration ?? 120;
    } else if (activeClipType === 'text') {
      const clip = textClips.find(c => c.id === activeClip);
      currentPosition = clip?.position ?? 0;
      currentDuration = clip?.duration ?? 120;
    } else if (activeClipType === 'sound') {
      const clip = soundClips.find(c => c.id === activeClip);
      currentPosition = clip?.position ?? 0;
      currentDuration = clip?.duration ?? 120;
    }
    
    const requestedPosition = Math.max(0, currentPosition + deltaBasePx);
    
    let laneClips: Array<{ id: string; position: number; duration: number }> = [];
    if (laneType === 'video') {
      laneClips = getVideoClipsForLane(clips, laneIndex) as Array<{ id: string; position: number; duration: number }>;
    } else if (laneType === 'text') {
      laneClips = getTextClipsForLane(textClips, laneIndex) as Array<{ id: string; position: number; duration: number }>;
    } else if (laneType === 'sound') {
      laneClips = getClipsForLane(soundClips, laneIndex) as Array<{ id: string; position: number; duration: number }>;
    }
    
    const { maxRatio } = getMaxOverlapRatio(
      laneClips,
      activeClip,
      requestedPosition,
      currentDuration
    );
    
    return maxRatio >= OVERLAP_REPLACE_THRESHOLD;
  }, [isDragging, activeClip, activeClipType, dragTargetLane, lastMouseX, dragStartX, pixelsPerSecond, clips, textClips, soundClips]);
  
  /**
   * 고스트 프리뷰용: 대체될 대상 클립의 ID (있으면 하이라이트)
   */
  const getGhostReplaceTargetIdForLane = useCallback((
    laneType: 'video' | 'text' | 'sound',
    laneIndex: number
  ): string | null => {
    if (!isDragging || !activeClip || !activeClipType) return null;
    if (activeClipType !== laneType) return null;
    if (!dragTargetLane || dragTargetLane.laneType !== laneType || dragTargetLane.laneIndex !== laneIndex) return null;
    
    const deltaScreenPx = (lastMouseX ?? dragStartX) - dragStartX;
    const zoomRatio = pixelsPerSecond / 40;
    const deltaBasePx = deltaScreenPx / zoomRatio;
    
    let currentPosition = 0;
    let currentDuration = 120;
    if (activeClipType === 'video') {
      const clip = clips.find(c => c.id === activeClip);
      currentPosition = clip?.position ?? 0;
      currentDuration = clip?.duration ?? 120;
    } else if (activeClipType === 'text') {
      const clip = textClips.find(c => c.id === activeClip);
      currentPosition = clip?.position ?? 0;
      currentDuration = clip?.duration ?? 120;
    } else if (activeClipType === 'sound') {
      const clip = soundClips.find(c => c.id === activeClip);
      currentPosition = clip?.position ?? 0;
      currentDuration = clip?.duration ?? 120;
    }
    
    const requestedPosition = Math.max(0, currentPosition + deltaBasePx);
    
    let laneClips: Array<{ id: string; position: number; duration: number }> = [];
    if (laneType === 'video') {
      laneClips = getVideoClipsForLane(clips, laneIndex) as Array<{ id: string; position: number; duration: number }>;
    } else if (laneType === 'text') {
      laneClips = getTextClipsForLane(textClips, laneIndex) as Array<{ id: string; position: number; duration: number }>;
    } else if (laneType === 'sound') {
      laneClips = getClipsForLane(soundClips, laneIndex) as Array<{ id: string; position: number; duration: number }>;
    }
    
    const { target, ratio } = getMaxOverlapTarget(laneClips, activeClip, requestedPosition, currentDuration);
    if (target && ratio >= OVERLAP_REPLACE_THRESHOLD) return target.id;
    return null;
  }, [isDragging, activeClip, activeClipType, dragTargetLane, lastMouseX, dragStartX, pixelsPerSecond, clips, textClips, soundClips]);
  
  /**
   * 선택 영역 기반 클립 업데이트
   */
  const updateRectSelectedClips = useCallback((left: number, right: number, top: number, bottom: number) => {
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
  }, [selectionContainerRef, setRectSelectedClips]);
  
  // 이벤트 핸들러들
  
  /**
   * 클립 마우스 다운 핸들러
   */
  const handleMouseDown = useCallback((e: React.MouseEvent, clipId: string, clipType: 'video' | 'text' | 'sound') => {
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
  }, [isNearPlayhead, isSelectingRange, isAdjustingSelection, isMovingSelection, setIsDraggingPlayhead, startDrag, setActiveClipInfo, selectClip]);
  
  /**
   * 리사이즈 시작 핸들러
   */
  const handleResizeStart = useCallback((e: React.MouseEvent, clipId: string, handle: 'left' | 'right', clipType: 'video' | 'text' | 'sound' = 'video') => {
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
  }, [isSelectingRange, isAdjustingSelection, isMovingSelection, clips, textClips, soundClips, startResize, setActiveClipInfo]);
  
  /**
   * 타임라인 클릭 핸들러 (시킹용)
   */
  const handleTimelineClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (e.shiftKey || isSelectingRange || isAdjustingSelection || isMovingSelection) return;
    if (!onSeek || isResizing || isDragging) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const time = Math.max(0, Math.min(x / pixelsPerSecond, Math.min(180, totalDurationInSeconds)));
    onSeek(time);
  }, [isSelectingRange, isAdjustingSelection, isMovingSelection, onSeek, isResizing, isDragging, pixelsPerSecond, totalDurationInSeconds]);
  
  /**
   * 트랙 클릭 핸들러 (시킹용)
   */
  const handleTrackClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
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
  }, [isNearPlayhead, isSelectingRange, isAdjustingSelection, isMovingSelection, onSeek, isResizing, isDragging, pixelsPerSecond, totalDurationInSeconds, setIsDraggingPlayhead]);
  
  /**
   * 재생헤드 마우스 다운 핸들러
   */
  const handlePlayheadMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    if (e.shiftKey || isSelectingRange || isAdjustingSelection || isMovingSelection) return;
    setIsDraggingPlayhead(true);
  }, [isSelectingRange, isAdjustingSelection, isMovingSelection, setIsDraggingPlayhead]);
  
  /**
   * 선택 영역 마우스 다운 핸들러
   */
  const handleSelectionMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
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
  }, [isNearPlayhead, isDragging, isResizing, isAdjustingSelection, isMovingSelection, selectionContainerRef, clearSelection, startSelection, setIsDraggingPlayhead]);
  
  // 마우스 무브 및 마우스 업 이펙트 설정
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      // Store last mouse event for lane detection
      setLastMouseX(e.clientX);
      setLastMouseY(e.clientY);
      
      if (!activeClip) return;
      
      // For all clip types, detect target lane during drag
      if (isDragging && activeClipType) {
        let targetLane = detectTargetLane(e.clientY, activeClipType);
        
        // fallback: 정확한 트랙 영역에 없을 때 가장 가까운 레인 찾기
        if (!targetLane) {
          targetLane = findNearestLaneAtY(e.clientY, activeClipType);
        }
        
        setDragTargetLane(targetLane);
        if (targetLane) {
          setLastHoverLane(targetLane);
          // 유효한 레인 정보를 ref에 동기적으로 저장
          latestValidLaneRef.current = targetLane;
        }
        // 기존 레인이 감지되지 않을 때만 새 레인 드롭존 감지
        if (!targetLane) {
          const newLaneType = detectNewLaneDropzone(e.clientY, activeClipType);
          setNewLaneTargetType(newLaneType);
        } else {
          setNewLaneTargetType(null);
        }
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
          const rightEdge = startPosition + startWidth; // keep right edge fixed
          const proposedLeft = startPosition + delta;
          newPosition = Math.max(minAllowedPosition, proposedLeft);
          newWidth = rightEdge - newPosition;
          
          if (currentClip?.maxDuration && newWidth > currentClip.maxDuration) {
            newWidth = currentClip.maxDuration;
            newPosition = rightEdge - newWidth;
          }
        } else {
          newWidth = startWidth + delta;
          
          // Limit width to maxDuration for right handle
          if (currentClip?.maxDuration) {
            newWidth = Math.min(newWidth, currentClip.maxDuration);
          }
        }
        
        // Apply minimum constraints
        const minWidthPx = 80;
        newWidth = Math.max(minWidthPx, newWidth);
        
        if (resizeHandle === 'left') {
          const rightEdge = startPosition + startWidth;
          newPosition = Math.max(minAllowedPosition, rightEdge - newWidth);
        } else {
          newPosition = Math.max(0, newPosition);
        }
        
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
        
        // 단일 또는 다중 선택된 클립을 함께 시각적으로 이동
        const targetClips: Array<{ id: string, type: 'video' | 'text' | 'sound' }> =
          (rectSelectedClips && rectSelectedClips.length > 0)
            ? rectSelectedClips
            : (activeClip && activeClipType)
              ? [{ id: activeClip, type: activeClipType }]
              : [];
        
        targetClips.forEach(({ id }) => {
          const node = document.querySelector(`[data-clip-id="${id}"]`) as HTMLElement | null;
          if (node) {
            node.style.transform = `translateX(${delta}px)`;
          }
        });
      }
    };
    
    const handleMouseUp = async () => {
      // 드래그 상태가 초기화되기 전에 현재 값들을 미리 캡처
      const currentDragTargetLane = dragTargetLane;
      const currentLastHoverLane = lastHoverLane;
      
      // 더 확실한 방법: 드래그 중 마지막으로 유효했던 레인 사용 (드롭 시점 감지는 부정확할 수 있음)
      let dropDetectedLane: { laneIndex: number; laneType: 'video' | 'text' | 'sound' } | null = null;
      if (lastMouseY !== null && activeClipType) {
        dropDetectedLane = detectTargetLane(lastMouseY, activeClipType) || findNearestLaneAtY(lastMouseY, activeClipType);
      }
      
      // ref에서 최신 유효 레인 정보 가져오기
      const latestValidLane = latestValidLaneRef.current;
      
      if (activeClip) {
        const clipElement = document.querySelector(`[data-clip-id="${activeClip}"]`) as HTMLElement;
        
        if (clipElement && isDragging) {
          const parsed = clipElement.style.transform
            ? parseFloat(clipElement.style.transform.replace(/translateX\(|px\)/g, ''))
            : NaN;
          // 화면 px → 내부 기준 px 변환 (40px/sec 기준)
          const zoomRatio = pixelsPerSecond / 40;
          const deltaScreenPx = Number.isFinite(parsed)
            ? parsed
            : ((lastMouseX !== null ? lastMouseX - dragStartX : 0));
          const delta = deltaScreenPx / zoomRatio;
          
          // 다중 선택 이동: 선택된 각 타입별로 독립 적용 (레인 구조 유지)
          const hasMulti = rectSelectedClips && rectSelectedClips.length > 0;
          
          // 새 레인 드롭존으로 드롭한 경우: 레인 추가 후 타겟 레인 지정
          let overrideTargetLane: { laneIndex: number, laneType: 'video' | 'text' | 'sound' } | null = null;
          if (newLaneTargetType && activeClipType === newLaneTargetType) {
            if (newLaneTargetType === 'video' && onAddVideoLane && canAddNewVideoLane(videoLanes)) {
              const newLaneIndex = videoLanes.length; // 새 레인 인덱스 예상
              onAddVideoLane();
              overrideTargetLane = { laneIndex: newLaneIndex, laneType: 'video' };
            } else if (newLaneTargetType === 'text' && onAddTextLane && canAddNewTextLane(textLanes)) {
              const newLaneIndex = textLanes.length;
              onAddTextLane();
              overrideTargetLane = { laneIndex: newLaneIndex, laneType: 'text' };
            } else if (newLaneTargetType === 'sound' && onAddSoundLane && canAddNewLane(soundLanes)) {
              const newLaneIndex = soundLanes.length;
              onAddSoundLane();
              overrideTargetLane = { laneIndex: newLaneIndex, laneType: 'sound' };
            }
          }
          
          // 마우스 업 순간의 최종 레인 재평가 (ref의 최신 유효 레인 최우선 사용)
          let finalResolvedLane = overrideTargetLane ?? latestValidLane ?? dropDetectedLane ?? currentDragTargetLane ?? currentLastHoverLane;
          if (!finalResolvedLane && lastMouseY !== null && activeClipType) {
            const detected = detectTargetLane(lastMouseY, activeClipType) || findNearestLaneAtY(lastMouseY, activeClipType);
            if (detected) {
              finalResolvedLane = detected;
            }
          }
          // Fallback: elementFromPoint로 최종 클립 영역 직접 히트테스트
          if (!finalResolvedLane && lastMouseX !== null && lastMouseY !== null && activeClipType) {
            const el = document.elementFromPoint(lastMouseX, lastMouseY) as HTMLElement | null;
            const clipAreaEl = el ? el.closest(`[data-clip-area-track-type="${activeClipType}"]`) as HTMLElement | null : null;
            if (clipAreaEl) {
              const laneAttr = clipAreaEl.getAttribute('data-clip-area-lane-id');
              const laneIdx = laneAttr ? parseInt(laneAttr, 10) : NaN;
              if (!Number.isNaN(laneIdx)) {
                finalResolvedLane = { laneIndex: laneIdx, laneType: activeClipType };
              }
            }
          }
          
          // TODO: 다중/단일 드래그 처리 로직 구현 필요
          // 현재는 placeholder로 대체
          console.log('Drag completed:', { delta, hasMulti, finalResolvedLane });
          
          // 모든 임시 transform 제거
          const targetClips: Array<{ id: string }> = hasMulti ? rectSelectedClips : [{ id: activeClip }];
          targetClips.forEach(({ id }) => {
            const node = document.querySelector(`[data-clip-id="${id}"]`) as HTMLElement | null;
            if (node) node.style.transform = '';
          });
        }
        
        // Handle resize end using common utility
        if (clipElement && isResizing && resizeMoved) {
          // TODO: 리사이즈 처리 로직 구현 필요
          console.log('Resize completed:', { 
            finalWidth: finalResizeWidth || startWidth,
            finalPosition: resizeHandle === 'left' ? finalResizePosition : startPosition,
            activeClip,
            activeClipType 
          });
        }
      }
      
      setActiveClipInfo(null, null);
      setDragTargetLane(null);
      setNewLaneTargetType(null);
      setLastMouseX(null);
      setLastMouseY(null);
      // ref 초기화
      latestValidLaneRef.current = null;
      setLastHoverLane(null);
      resetDragState();
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [
    activeClip, activeClipType, isDragging, isResizing, dragStartX, startWidth, startPosition, 
    resizeHandle, clips, textClips, soundClips, resizeMoved, finalResizeWidth, finalResizePosition,
    rectSelectedClips, lastMouseX, lastMouseY, pixelsPerSecond, dragTargetLane, lastHoverLane,
    newLaneTargetType, videoLanes, textLanes, soundLanes, detectTargetLane, findNearestLaneAtY,
    detectNewLaneDropzone, latestValidLaneRef, setLastMouseX, setLastMouseY, setActiveClipInfo,
    setDragTargetLane, setNewLaneTargetType, setLastHoverLane, resetDragState, onAddVideoLane,
    onAddTextLane, onAddSoundLane, checkResizeActivation, setFinalResizeWidth, setFinalResizePosition,
    updateDragDirection
  ]);
  
  return {
    // 이벤트 핸들러들
    handleMouseDown,
    handleResizeStart,
    handleTimelineClick,
    handleTrackClick,
    handlePlayheadMouseDown,
    handleSelectionMouseDown,
    
    // 유틸리티 함수들
    isNearPlayhead,
    detectTargetLane,
    detectNewLaneDropzone,
    findNearestLaneAtY,
    
    // 고스트 프리뷰 계산
    getGhostPreviewForLane,
    isGhostReplacingForLane,
    getGhostReplaceTargetIdForLane,
    
    // 선택 영역 업데이트
    updateRectSelectedClips,
  };
}