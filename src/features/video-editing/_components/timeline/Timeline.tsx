/**
 * Timeline - 비디오 편집 타임라인 메인 컴포넌트 🎬
 * 
 * 📌 주요 기능:
 * 1. 다중 레인 지원 (비디오/텍스트/사운드 각각 독립적)
 * 2. 클립 드래그 앤 드롭 및 리사이즈 기능
 * 3. 클립 선택/다중 선택 및 컨텍스트 메뉴
 * 4. 재생헤드 제어 및 시간 탐색
 * 5. 줌 인/아웃 및 그리드 표시
 * 6. 실행 취소/다시 실행 기능
 * 
 * 🎯 핵심 특징:
 * - 레인별 독립적인 클립 관리 (비디오 3개, 텍스트 무제한, 사운드 무제한)
 * - 실시간 오버레이 감지 및 자동 교체/배치 로직
 * - 마그네틱 스냅 기능으로 정확한 클립 정렬
 * - 사용자 선호도 기반 겹침 처리 (항상 교체/묻기/절대 교체 안함)
 * 
 * 🚧 현재 상태:
 * - 구 Timeline 컴포넌트 (1957라인) - 추후 분해된 TimelineContainer로 교체 예정
 * - 모든 기능이 하나의 파일에 집중되어 있어 유지보수 어려움
 * - God Component 패턴으로 SRP 위반
 * 
 * 💡 사용법:
 * ```tsx
 * <Timeline
 *   clips={videoClips}
 *   textClips={textClips}
 *   soundClips={soundClips}
 *   videoLanes={[0, 1, 2]}
 *   textLanes={[0, 1]}
 *   soundLanes={[0]}
 *   currentTime={30}
 *   pixelsPerSecond={40}
 *   onSeek={(time) => seekTo(time)}
 *   // ... 기타 이벤트 핸들러들
 * />
 * ```
 */
'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { VideoClip as VideoClipType, TextClip as TextClipType, SoundClip as SoundClipType } from '@/shared/types/video-editor';
import TimelineControls from '@/app/video-editor/_components/TimelineControls';
import TimelineTrack from '@/app/video-editor/_components/TimelineTrack';
import TimelinePlayhead from '@/app/video-editor/_components/TimelinePlayhead';
import TimelineSelectionBox from '@/app/video-editor/_components/TimelineSelectionBox';
import TimelineGrid from '@/app/video-editor/_components/TimelineGrid';
import { useDragAndDrop } from '@/app/video-editor/_hooks/useDragAndDrop';
import { useSelectionState } from '@/app/video-editor/_hooks/useSelectionState';
import { useClips } from '@/app/video-editor/_context/Providers';
import { calculateTimelineDuration, generateTimeMarkers, magneticPositioning, getMaxOverlapRatio, OVERLAP_REPLACE_THRESHOLD, getMaxOverlapTarget } from '@/features/video-editing/_utils/common-clip-utils';
import { useUserPreferences } from '@/shared/hooks/useUserPreferences';
import { getClipsForLane, canAddNewLane, getTextClipsForLane, canAddNewTextLane, getVideoClipsForLane, canAddNewVideoLane } from '@/features/video-editing/_utils/lane-arrangement';

/**
 * Timeline 컴포넌트 Props 인터페이스 🎛️
 * 
 * 📋 Props 그룹별 설명:
 * 
 * 📦 **클립 데이터 (기본)**:
 * - clips, textClips, soundClips: 각 레인 타입별 클립 배열
 * - videoLanes, textLanes, soundLanes: 활성화된 레인 인덱스 배열
 * 
 * ➕ **클립 생성 액션**:
 * - onAddClip, onAddText, onAddSound: 새 클립 생성
 * - onAddVideoLane, onAddTextLane, onAddSoundLane: 새 레인 추가
 * - onAddVideoToLane, onAddTextToLane, onAddSoundToLane: 특정 레인에 클립 추가
 * 
 * 🗑️ **삭제 액션**:
 * - onDeleteVideoClip, onDeleteTextClip, onDeleteSoundClip: 클립 삭제
 * - onDeleteVideoLane, onDeleteTextLane, onDeleteSoundLane: 레인 삭제
 * 
 * ✂️ **편집 액션**:
 * - onDuplicate*, onSplit*, onResize*: 복제/분할/크기 조정
 * - onUpdate*Position, onUpdate*Lane: 위치/레인 변경
 * - onReorder*Clips: 클립 순서 변경
 * 
 * 🎮 **재생 제어**:
 * - currentTime, totalDuration: 시간 정보
 * - isPlaying, onSeek, onPlayPause: 재생 상태
 * 
 * 🔧 **기타 제어**:
 * - pixelsPerSecond: 줌 레벨
 * - onUndo, onRedo, canUndo, canRedo: 실행 취소/다시 실행
 */
interface TimelineProps {
  /** 📹 비디오 클립 배열 - 메인 비디오 레인들 */
  clips: VideoClipType[];
  /** 📝 텍스트 클립 배열 - 자막/타이틀 레인들 */
  textClips?: TextClipType[];
  /** 🔊 사운드 클립 배열 - 오디오 레인들 */
  soundClips?: SoundClipType[];
  /** 🔊 활성 사운드 레인 인덱스들 - 예: [0, 1, 2] */
  soundLanes?: number[];
  /** 📝 활성 텍스트 레인 인덱스들 - 예: [0, 1] */
  textLanes?: number[];
  /** 📹 활성 비디오 레인 인덱스들 - 예: [0, 1, 2] (최대 3개) */
  videoLanes?: number[];

  // ➕ 클립 생성 관련 핸들러들
  /** ➕ 새 비디오 클립 추가 */
  onAddClip: () => void;
  /** ➕ 새 텍스트 클립 추가 */
  onAddText?: () => void;
  /** ➕ 새 사운드 클립 추가 */
  onAddSound?: () => void;

  // 📊 레인 관리 핸들러들
  /** ➕ 새 사운드 레인 추가 */
  onAddSoundLane?: () => void;
  /** 🗑️ 사운드 레인 삭제 */
  onDeleteSoundLane?: (laneIndex: number) => void;
  /** ➕ 특정 사운드 레인에 클립 추가 */
  onAddSoundToLane?: (laneIndex: number) => void;
  /** ➕ 새 텍스트 레인 추가 */
  onAddTextLane?: () => void;
  /** 🗑️ 텍스트 레인 삭제 */
  onDeleteTextLane?: (laneIndex: number) => void;
  /** ➕ 특정 텍스트 레인에 클립 추가 */
  onAddTextToLane?: (laneIndex: number) => void;
  /** ➕ 새 비디오 레인 추가 */
  onAddVideoLane?: () => void;
  /** 🗑️ 비디오 레인 삭제 */
  onDeleteVideoLane?: (laneIndex: number) => void;
  /** ➕ 특정 비디오 레인에 클립 추가 */
  onAddVideoToLane?: (laneIndex: number) => void;
  // ✏️ 편집 관련 핸들러들
  /** ✏️ 텍스트 클립 편집 (내용, 스타일 등) */
  onEditTextClip?: (clip: TextClipType) => void;
  /** ✏️ 사운드 클립 편집 (볼륨, 페이드 등) */
  onEditSoundClip?: (clip: SoundClipType) => void;

  // 🗑️ 삭제 관련 핸들러들
  /** 🗑️ 텍스트 클립 삭제 */
  onDeleteTextClip?: (id: string) => void;
  /** 🗑️ 사운드 클립 삭제 */
  onDeleteSoundClip?: (id: string) => void;
  /** 🗑️ 비디오 클립 삭제 */
  onDeleteVideoClip?: (id: string) => void;

  // 📋 복제 관련 핸들러들
  /** 📋 비디오 클립 복제 */
  onDuplicateVideoClip?: (id: string) => void;
  /** 📋 텍스트 클립 복제 */
  onDuplicateTextClip?: (id: string) => void;
  /** 📋 사운드 클립 복제 */
  onDuplicateSoundClip?: (id: string) => void;

  // ✂️ 분할 관련 핸들러들
  /** ✂️ 비디오 클립 분할 (현재 재생 위치에서) */
  onSplitVideoClip?: (id: string) => void;
  /** ✂️ 텍스트 클립 분할 */
  onSplitTextClip?: (id: string) => void;
  /** ✂️ 사운드 클립 분할 */
  onSplitSoundClip?: (id: string) => void;

  // 🔀 크기 조정 및 위치 변경 핸들러들
  /** 🔀 텍스트 클립 크기 조정 */
  onResizeTextClip?: (id: string, newDuration: number) => void;
  /** 🔀 사운드 클립 크기 조정 (좌/우 핸들 지원) */
  onResizeSoundClip?: (id: string, newDuration: number, handle?: 'left' | 'right', deltaPosition?: number) => void;
  /** 🔀 비디오 클립 크기 조정 (좌/우 핸들 지원) */
  onResizeVideoClip?: (id: string, newDuration: number, handle?: 'left' | 'right', deltaPosition?: number) => void;

  // 📦 순서 변경 및 위치 업데이트 핸들러들
  /** 📦 비디오 클립들 순서 변경 */
  onReorderVideoClips?: (clips: VideoClipType[]) => void;
  /** 📦 텍스트 클립들 순서 변경 */
  onReorderTextClips?: (clips: TextClipType[]) => void;
  /** 📦 사운드 클립들 순서 변경 */
  onReorderSoundClips?: (clips: SoundClipType[]) => void;

  // 📍 개별 클립 위치 업데이트 핸들러들
  /** 📍 비디오 클립 위치 변경 */
  onUpdateVideoClipPosition?: (id: string, newPosition: number) => void;
  /** 📍 텍스트 클립 위치 변경 */
  onUpdateTextClipPosition?: (id: string, newPosition: number) => void;
  /** 📍 사운드 클립 위치 변경 */
  onUpdateSoundClipPosition?: (id: string, newPosition: number) => void;

  // 🔄 전체 클립 배열 업데이트 핸들러들 (대량 변경 시 사용)
  /** 🔄 모든 비디오 클립 업데이트 */
  onUpdateAllVideoClips?: (clips: VideoClipType[]) => void;
  /** 🔄 모든 텍스트 클립 업데이트 */
  onUpdateAllTextClips?: (clips: TextClipType[]) => void;
  /** 🔄 모든 사운드 클립 업데이트 */
  onUpdateAllSoundClips?: (clips: SoundClipType[]) => void;

  // 🎵 사운드 특수 기능 핸들러들
  /** 🎵 사운드 볼륨 조정 (0.0 ~ 1.0) */
  onUpdateSoundVolume?: (id: string, volume: number) => void;
  /** 🎵 사운드 페이드 효과 설정 */
  onUpdateSoundFade?: (id: string, fadeType: 'fadeIn' | 'fadeOut', duration: number) => void;

  // 🛤️ 레인 변경 핸들러들
  /** 🛤️ 사운드 클립 레인 변경 */
  onUpdateSoundClipLane?: (id: string, laneIndex: number) => void;
  /** 🛤️ 텍스트 클립 레인 변경 */
  onUpdateTextClipLane?: (id: string, laneIndex: number) => void;
  /** 🛤️ 비디오 클립 레인 변경 */
  onUpdateVideoClipLane?: (id: string, laneIndex: number) => void;

  // 🎮 재생 및 제어 관련
  /** 📏 줌 레벨 - 1초당 픽셀 수 (예: 40 = 1초당 40픽셀) */
  pixelsPerSecond?: number;
  /** ⏱️ 현재 재생 시간 (초) */
  currentTime?: number;
  /** ⏱️ 총 영상 길이 (초) */
  totalDuration?: number;
  /** ▶️ 재생 중 여부 */
  isPlaying?: boolean;
  /** 🎯 시간 이동 핸들러 (초 단위) */
  onSeek?: (time: number) => void;
  /** ⏯️ 재생/일시정지 토글 */
  onPlayPause?: () => void;

  // 🔄 실행 취소/다시 실행
  /** ↶ 실행 취소 */
  onUndo?: () => void;
  /** ↷ 다시 실행 */
  onRedo?: () => void;
  /** ↶ 실행 취소 가능 여부 */
  canUndo?: boolean;
  /** ↷ 다시 실행 가능 여부 */
  canRedo?: boolean;
}

export default function Timeline({ 
  clips, 
  textClips = [],
  soundClips = [],
  soundLanes = [0], // Default to single lane
  textLanes = [0], // Default to single text lane
  videoLanes = [0], // Default to single video lane
  onAddClip: addClipAction, // eslint-disable-line @typescript-eslint/no-unused-vars
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
  onReorderVideoClips,
  onReorderTextClips,
  onReorderSoundClips,
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
  // 사용자 겹침 교체 기본 설정 로드
  const { profile } = useUserPreferences();

  /**
   * 겹침 교체 여부를 비동기적으로 결정
   * - 사용자 설정이 'always_replace'면 즉시 true
   * - 그 외에는 모달을 열어 사용자에게 확인 요청
   */
  const askReplaceOnOverlap = useCallback(async (): Promise<boolean> => {
    if (profile?.overlap_replace_preference === 'always_replace') return true;
    if (profile?.overlap_replace_preference === 'never_replace') return false;
    // Ask via modal
    return await new Promise<boolean>((resolve) => {
      const resolver = (result: { replace: boolean }) => resolve(result.replace);
      const event = new CustomEvent('openOverlapReplaceConfirm', { detail: { resolver } });
      window.dispatchEvent(event);
    });
  }, [profile?.overlap_replace_preference]);

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
  // 드래그 중 마지막 마우스 X 좌표 (고스트 프리뷰 계산용)
  const [lastMouseX, setLastMouseX] = useState<number | null>(null);
  const [lastMouseY, setLastMouseY] = useState<number | null>(null);
  // 새 레인 드롭존 타겟 타입 (video/text/sound)
  const [newLaneTargetType, setNewLaneTargetType] = useState<'video' | 'text' | 'sound' | null>(null);
  // 마지막으로 감지된 유효 드래그 레인(마우스 업 시 보정용)
  const [lastHoverLane, setLastHoverLane] = useState<{ laneIndex: number, laneType: 'video' | 'text' | 'sound' } | null>(null);
  
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
  
  // 최신 레인 정보를 동기적으로 저장하기 위한 ref
  const latestValidLaneRef = useRef<{ laneIndex: number; laneType: 'video' | 'text' | 'sound' } | null>(null);

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

  // 새 레인 드롭존 감지 (각 섹션 하단 24px 영역)
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

  // 주어진 Y좌표에서 가장 가까운 레인 찾기 (동일 타입)
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

  // 드래그 고스트 프리뷰 계산 (단순 요청 위치 기준 - 실제 드롭 시 자석 배치 적용)
  const getGhostPreviewForLane = (
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
  };

  // 드래그 프리뷰가 교체 동작인지 여부
  const isGhostReplacingForLane = (
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
  };

  // 고스트 프리뷰용: 대체될 대상 클립의 ID (있으면 하이라이트)
  const getGhostReplaceTargetIdForLane = (
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
  };

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

    const handleMouseUp = () => {
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


          
          if (hasMulti) {
            import('@/features/video-editing/_utils/common-clip-utils').then(({ handleClipDrag }) => {
              // 겹침 임계치 충족 여부 사전 계산 (선택된 모든 클립 기준)
              const anyNeedsReplacement = (() => {
                // 비디오 선택 클립 검사
                const videoIds = rectSelectedClips.filter(c => c.type === 'video').map(c => c.id);
                for (const id of videoIds) {
                  const clip = clips.find(c => c.id === id);
                  if (!clip) continue;
                  const targetLaneIndex = (finalResolvedLane && finalResolvedLane.laneType === 'video') ? finalResolvedLane.laneIndex : (clip.laneIndex ?? 0);
                  const laneClips = getVideoClipsForLane(clips, targetLaneIndex) as Array<{ id: string; position: number; duration: number }>;
                  const requestedPosition = Math.max(0, clip.position + delta);
                  const { maxRatio } = getMaxOverlapRatio(laneClips, id, requestedPosition, clip.duration);
                  if (maxRatio >= OVERLAP_REPLACE_THRESHOLD) return true;
                }
                // 텍스트 선택 클립 검사
                const textIds = rectSelectedClips.filter(c => c.type === 'text').map(c => c.id);
                for (const id of textIds) {
                  const clip = textClips.find(c => c.id === id);
                  if (!clip) continue;
                  const targetLaneIndex = (finalResolvedLane && finalResolvedLane.laneType === 'text') ? finalResolvedLane.laneIndex : (clip.laneIndex ?? 0);
                  const laneClips = getTextClipsForLane(textClips, targetLaneIndex) as Array<{ id: string; position: number; duration: number }>;
                  const requestedPosition = Math.max(0, clip.position + delta);
                  const { maxRatio } = getMaxOverlapRatio(laneClips, id, requestedPosition, clip.duration);
                  if (maxRatio >= OVERLAP_REPLACE_THRESHOLD) return true;
                }
                // 사운드 선택 클립 검사
                const soundIds = rectSelectedClips.filter(c => c.type === 'sound').map(c => c.id);
                for (const id of soundIds) {
                  const clip = soundClips.find(c => c.id === id);
                  if (!clip) continue;
                  const targetLaneIndex = (finalResolvedLane && finalResolvedLane.laneType === 'sound') ? finalResolvedLane.laneIndex : (clip.laneIndex ?? 0);
                  const laneClips = getClipsForLane(soundClips, targetLaneIndex) as Array<{ id: string; position: number; duration: number }>;
                  const requestedPosition = Math.max(0, clip.position + delta);
                  const { maxRatio } = getMaxOverlapRatio(laneClips, id, requestedPosition, clip.duration);
                  if (maxRatio >= OVERLAP_REPLACE_THRESHOLD) return true;
                }
                return false;
              })();

              if (anyNeedsReplacement) {
                // 비동기 확인 후 처리
                (async () => {
                  const confirmed = await askReplaceOnOverlap();
                  // 비디오
                  if (onUpdateAllVideoClips) {
                    const videoIds = rectSelectedClips.filter(c => c.type === 'video').map(c => c.id);
                    let working = [...clips];
                    videoIds.forEach(id => {
                      handleClipDrag(id, 'video', working, delta, finalResolvedLane ?? null, (newClips) => {
                        working = newClips;
                      }, { replaceOnOverlap: confirmed, timelineWidth: timelineLengthInSeconds * basePixelsPerSecond });
                    });
                    onUpdateAllVideoClips(working);
                  } else if (onReorderVideoClips) {
                    const videoIds = rectSelectedClips.filter(c => c.type === 'video').map(c => c.id);
                    let working = [...clips];
                    videoIds.forEach(id => {
                      handleClipDrag(id, 'video', working, delta, finalResolvedLane ?? null, (newClips) => {
                        working = newClips;
                      }, { replaceOnOverlap: confirmed, timelineWidth: timelineLengthInSeconds * basePixelsPerSecond });
                    });
                    onReorderVideoClips(working);
                  }
                  // 텍스트
                  if (onUpdateAllTextClips) {
                    const textIds = rectSelectedClips.filter(c => c.type === 'text').map(c => c.id);
                    let workingText = [...textClips];
                    textIds.forEach(id => {
                      handleClipDrag(id, 'text', workingText, delta, finalResolvedLane ?? null, (newClips) => {
                        workingText = newClips;
                      }, { replaceOnOverlap: confirmed, timelineWidth: timelineLengthInSeconds * basePixelsPerSecond });
                    });
                    onUpdateAllTextClips(workingText);
                  } else if (onReorderTextClips) {
                    const textIds = rectSelectedClips.filter(c => c.type === 'text').map(c => c.id);
                    let workingText = [...textClips];
                    textIds.forEach(id => {
                      handleClipDrag(id, 'text', workingText, delta, finalResolvedLane ?? null, (newClips) => {
                        workingText = newClips;
                      }, { replaceOnOverlap: confirmed, timelineWidth: timelineLengthInSeconds * basePixelsPerSecond });
                    });
                    onReorderTextClips(workingText);
                  }
                  // 사운드
                  if (onUpdateAllSoundClips) {
                    const soundIds = rectSelectedClips.filter(c => c.type === 'sound').map(c => c.id);
                    let workingSound = [...soundClips];
                    soundIds.forEach(id => {
                      handleClipDrag(id, 'sound', workingSound, delta, finalResolvedLane ?? null, (newClips) => {
                        workingSound = newClips;
                      }, { replaceOnOverlap: confirmed, timelineWidth: timelineLengthInSeconds * basePixelsPerSecond });
                    });
                    onUpdateAllSoundClips(workingSound);
                  } else if (onReorderSoundClips) {
                    const soundIds = rectSelectedClips.filter(c => c.type === 'sound').map(c => c.id);
                    let workingSound = [...soundClips];
                    soundIds.forEach(id => {
                      handleClipDrag(id, 'sound', workingSound, delta, finalResolvedLane ?? null, (newClips) => {
                        workingSound = newClips;
                      }, { replaceOnOverlap: confirmed, timelineWidth: timelineLengthInSeconds * basePixelsPerSecond });
                    });
                    onReorderSoundClips(workingSound);
                  }
                })();
                return;
              }

              const replaceOnOverlap = false;

              // 비디오 (겹침 없음 기본 처리)
              if (onUpdateAllVideoClips) {
                const videoIds = rectSelectedClips.filter(c => c.type === 'video').map(c => c.id);
                let working = [...clips];
                videoIds.forEach(id => {
                  handleClipDrag(id, 'video', working, delta, finalResolvedLane ?? null, (newClips) => {
                    working = newClips;
                  }, { replaceOnOverlap, timelineWidth: timelineLengthInSeconds * basePixelsPerSecond });
                });
                onUpdateAllVideoClips(working);
              } else if (onReorderVideoClips) {
                const videoIds = rectSelectedClips.filter(c => c.type === 'video').map(c => c.id);
                let working = [...clips];
                videoIds.forEach(id => {
                  handleClipDrag(id, 'video', working, delta, finalResolvedLane ?? null, (newClips) => {
                    working = newClips;
                  }, { replaceOnOverlap, timelineWidth: timelineLengthInSeconds * basePixelsPerSecond });
                });
                onReorderVideoClips(working);
              }
              // 텍스트 (겹침 없음 기본 처리)
              if (onUpdateAllTextClips) {
                const textIds = rectSelectedClips.filter(c => c.type === 'text').map(c => c.id);
                let workingText = [...textClips];
                textIds.forEach(id => {
                  handleClipDrag(id, 'text', workingText, delta, finalResolvedLane ?? null, (newClips) => {
                    workingText = newClips;
                  }, { replaceOnOverlap, timelineWidth: timelineLengthInSeconds * basePixelsPerSecond });
                });
                onUpdateAllTextClips(workingText);
              } else if (onReorderTextClips) {
                const textIds = rectSelectedClips.filter(c => c.type === 'text').map(c => c.id);
                let workingText = [...textClips];
                textIds.forEach(id => {
                  handleClipDrag(id, 'text', workingText, delta, finalResolvedLane ?? null, (newClips) => {
                    workingText = newClips;
                  }, { replaceOnOverlap, timelineWidth: timelineLengthInSeconds * basePixelsPerSecond });
                });
                onReorderTextClips(workingText);
              }
              // 사운드 (겹침 없음 기본 처리)
              if (onUpdateAllSoundClips) {
                const soundIds = rectSelectedClips.filter(c => c.type === 'sound').map(c => c.id);
                let workingSound = [...soundClips];
                soundIds.forEach(id => {
                  handleClipDrag(id, 'sound', workingSound, delta, finalResolvedLane ?? null, (newClips) => {
                    workingSound = newClips;
                  }, { replaceOnOverlap, timelineWidth: timelineLengthInSeconds * basePixelsPerSecond });
                });
                onUpdateAllSoundClips(workingSound);
              } else if (onReorderSoundClips) {
                const soundIds = rectSelectedClips.filter(c => c.type === 'sound').map(c => c.id);
                let workingSound = [...soundClips];
                soundIds.forEach(id => {
                  handleClipDrag(id, 'sound', workingSound, delta, finalResolvedLane ?? null, (newClips) => {
                    workingSound = newClips;
                  }, { replaceOnOverlap, timelineWidth: timelineLengthInSeconds * basePixelsPerSecond });
                });
                onReorderSoundClips(workingSound);
              }
            });
          } else {
            // 단일 이동 (기존 동작)
            import('@/features/video-editing/_utils/common-clip-utils').then(({ handleClipDrag }) => {
              if (activeClipType === 'video') {
                // 교체 임계치 확인
                const clip = clips.find(c => c.id === activeClip);
                const replaceOnOverlap = false;
                if (clip) {
                  const targetLaneIndex = (finalResolvedLane && finalResolvedLane.laneType === 'video') ? finalResolvedLane.laneIndex : (clip.laneIndex ?? 0);
                  const laneClips = getVideoClipsForLane(clips, targetLaneIndex) as Array<{ id: string; position: number; duration: number }>;
                  const requestedPosition = Math.max(0, (clip?.position ?? 0) + delta);
                  const { maxRatio } = getMaxOverlapRatio(laneClips, activeClip, requestedPosition, clip?.duration ?? 0);
                  if (maxRatio >= OVERLAP_REPLACE_THRESHOLD) {
                    let localReplaceOnOverlap = true;
                    // 모달 확인 (비동기)
                    // NOTE: handleClipDrag 호출 전까지 await로 결정
                    (async () => {
                      const allow = await askReplaceOnOverlap();
                      localReplaceOnOverlap = allow;
                      if (onUpdateAllVideoClips) {
                        handleClipDrag(activeClip, 'video', clips, delta, finalResolvedLane ?? null, onUpdateAllVideoClips, { replaceOnOverlap: localReplaceOnOverlap, timelineWidth: timelineLengthInSeconds * basePixelsPerSecond });
                      } else if (onReorderVideoClips) {
                        handleClipDrag(activeClip, 'video', clips, delta, finalResolvedLane ?? null, onReorderVideoClips, { replaceOnOverlap: localReplaceOnOverlap, timelineWidth: timelineLengthInSeconds * basePixelsPerSecond });
                      }
                    })();
                    return;
                  }
                }
                if (onUpdateAllVideoClips) {
                  handleClipDrag(activeClip, 'video', clips, delta, finalResolvedLane ?? null, onUpdateAllVideoClips, { replaceOnOverlap, timelineWidth: timelineLengthInSeconds * basePixelsPerSecond });
                } else if (onReorderVideoClips) {
                  handleClipDrag(activeClip, 'video', clips, delta, finalResolvedLane ?? null, onReorderVideoClips, { replaceOnOverlap, timelineWidth: timelineLengthInSeconds * basePixelsPerSecond });
                }
              } else if (activeClipType === 'text') {
                const clip = textClips.find(c => c.id === activeClip);
                const replaceOnOverlap = false;
                if (clip) {
                  const targetLaneIndex = (finalResolvedLane && finalResolvedLane.laneType === 'text') ? finalResolvedLane.laneIndex : (clip.laneIndex ?? 0);
                  const laneClips = getTextClipsForLane(textClips, targetLaneIndex) as Array<{ id: string; position: number; duration: number }>;
                  const requestedPosition = Math.max(0, (clip?.position ?? 0) + delta);
                  const { maxRatio } = getMaxOverlapRatio(laneClips, activeClip, requestedPosition, clip?.duration ?? 0);
                  if (maxRatio >= OVERLAP_REPLACE_THRESHOLD) {
                    (async () => {
                      const allow = await askReplaceOnOverlap();
                      if (onUpdateAllTextClips) {
                        handleClipDrag(activeClip, 'text', textClips, delta, finalResolvedLane ?? null, onUpdateAllTextClips, { replaceOnOverlap: allow, timelineWidth: timelineLengthInSeconds * basePixelsPerSecond });
                      } else if (onReorderTextClips) {
                        handleClipDrag(activeClip, 'text', textClips, delta, finalResolvedLane ?? null, onReorderTextClips, { replaceOnOverlap: allow, timelineWidth: timelineLengthInSeconds * basePixelsPerSecond });
                      }
                    })();
                    return;
                  }
                }
                if (onUpdateAllTextClips) {
                  handleClipDrag(activeClip, 'text', textClips, delta, finalResolvedLane ?? null, onUpdateAllTextClips, { replaceOnOverlap, timelineWidth: timelineLengthInSeconds * basePixelsPerSecond });
                } else if (onReorderTextClips) {
                  handleClipDrag(activeClip, 'text', textClips, delta, finalResolvedLane ?? null, onReorderTextClips, { replaceOnOverlap, timelineWidth: timelineLengthInSeconds * basePixelsPerSecond });
                }
              } else if (activeClipType === 'sound') {
                const clip = soundClips.find(c => c.id === activeClip);
                const replaceOnOverlap = false;
                if (clip) {
                  const targetLaneIndex = (finalResolvedLane && finalResolvedLane.laneType === 'sound') ? finalResolvedLane.laneIndex : (clip.laneIndex ?? 0);
                  const laneClips = getClipsForLane(soundClips, targetLaneIndex) as Array<{ id: string; position: number; duration: number }>;
                  const requestedPosition = Math.max(0, (clip?.position ?? 0) + delta);
                  const { maxRatio } = getMaxOverlapRatio(laneClips, activeClip, requestedPosition, clip?.duration ?? 0);
                  if (maxRatio >= OVERLAP_REPLACE_THRESHOLD) {
                    (async () => {
                      const allow = await askReplaceOnOverlap();
                      if (onUpdateAllSoundClips) {
                        handleClipDrag(activeClip, 'sound', soundClips, delta, finalResolvedLane ?? null, onUpdateAllSoundClips, { replaceOnOverlap: allow, timelineWidth: timelineLengthInSeconds * basePixelsPerSecond });
                      } else if (onReorderSoundClips) {
                        handleClipDrag(activeClip, 'sound', soundClips, delta, finalResolvedLane ?? null, onReorderSoundClips, { replaceOnOverlap: allow, timelineWidth: timelineLengthInSeconds * basePixelsPerSecond });
                      }
                    })();
                    return;
                  }
                }
                if (onUpdateAllSoundClips) {
                  handleClipDrag(activeClip, 'sound', soundClips, delta, finalResolvedLane ?? null, onUpdateAllSoundClips, { replaceOnOverlap, timelineWidth: timelineLengthInSeconds * basePixelsPerSecond });
                } else if (onReorderSoundClips) {
                  handleClipDrag(activeClip, 'sound', soundClips, delta, finalResolvedLane ?? null, onReorderSoundClips, { replaceOnOverlap, timelineWidth: timelineLengthInSeconds * basePixelsPerSecond });
                }
              }
            });
          }

          // 모든 임시 transform 제거
          const targetClips: Array<{ id: string }> = hasMulti ? rectSelectedClips : [{ id: activeClip }];
          targetClips.forEach(({ id }) => {
            const node = document.querySelector(`[data-clip-id="${id}"]`) as HTMLElement | null;
            if (node) node.style.transform = '';
          });
        }
        
        // Handle resize end using common utility
        if (clipElement && isResizing && resizeMoved) {
          const finalWidth = finalResizeWidth || startWidth;
          const finalPosition = resizeHandle === 'left' ? finalResizePosition : startPosition;
          
          import('@/features/video-editing/_utils/common-clip-utils').then(({ handleClipResize }) => {
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
      setNewLaneTargetType(null);
      setLastMouseX(null);
      setLastMouseY(null);
      // ref 초기화
      latestValidLaneRef.current = null;
      setLastHoverLane(null);
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
    <div className="bg-gray-800 border-t border-gray-700 flex flex-col h-full select-none">
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
              <div key={`video-lane-${laneIndex}`} className="border-b border-r border-gray-700 h-8 flex items-center justify-between px-2 bg-gray-950/30 group/lane hover:bg-gray-900/40 transition-colors">
                <div className="flex items-center gap-2 flex-1">
                  <span className="text-[10px] text-blue-400 font-medium">Video {laneIndex + 1}</span>
                  {laneIndex > 0 && (
                    <button 
                      onClick={() => onDeleteVideoLane?.(laneIndex)}
                      className="opacity-0 group-hover/lane:opacity-100 w-3 h-3 bg-red-900/80 rounded-sm flex items-center justify-center hover:bg-red-700 transition-all duration-200"
                      title={`Delete Video Lane ${laneIndex + 1}`}
                    >
                      <i className="ri-delete-bin-7-line text-[7px] text-red-300 hover:text-white"></i>
                    </button>
                  )}
                </div>
                <button 
                  onClick={() => onAddVideoToLane?.(laneIndex)}
                  className="h-5 bg-black rounded flex items-center justify-center gap-1 hover:bg-gray-900 transition-colors group/add min-w-[60px] px-2"
                >
                  <i className="ri-add-line text-[10px] text-[#38f47cf9] group-hover/add:text-white"></i>
                  <span className="text-[10px] text-[#38f47cf9] group-hover/add:text-white">Add</span>
                </button>
              </div>
            ))}

            {/* Text Lanes Section */}
            {textLanes.map((laneIndex) => (
              <div key={`text-lane-${laneIndex}`} className="border-b border-r border-gray-700 h-8 flex items-center justify-between px-2 bg-gray-950/20 group/lane hover:bg-gray-900/30 transition-colors">
                <div className="flex items-center gap-2 flex-1">
                  <span className="text-[10px] text-green-400 font-medium">Text {laneIndex + 1}</span>
                  {laneIndex > 0 && (
                    <button 
                      onClick={() => onDeleteTextLane?.(laneIndex)}
                      className="opacity-0 group-hover/lane:opacity-100 w-3 h-3 bg-red-900/80 rounded-sm flex items-center justify-center hover:bg-red-700 transition-all duration-200"
                      title={`Delete Text Lane ${laneIndex + 1}`}
                    >
                      <i className="ri-delete-bin-7-line text-[7px] text-red-300 hover:text-white"></i>
                    </button>
                  )}
                </div>
                <button 
                  onClick={() => onAddTextToLane?.(laneIndex)}
                  className="h-5 bg-black rounded flex items-center justify-center gap-1 hover:bg-gray-900 transition-colors group/add min-w-[60px] px-2"
                >
                  <i className="ri-add-line text-[10px] text-[#38f47cf9] group-hover/add:text-white"></i>
                  <span className="text-[10px] text-[#38f47cf9] group-hover/add:text-white">Add</span>
                </button>
              </div>
            ))}

            {/* Sound Lanes Section */}
            {soundLanes.map((laneIndex) => (
              <div key={`sound-lane-${laneIndex}`} className="border-r border-gray-700 h-12 flex items-center justify-between px-2 bg-gray-950/10 group/lane hover:bg-gray-900/20 transition-colors">
                <div className="flex items-center gap-2 flex-1">
                  <span className="text-[10px] text-purple-400 font-medium">Sound {laneIndex + 1}</span>
                  {laneIndex > 0 && (
                    <button 
                      onClick={() => onDeleteSoundLane?.(laneIndex)}
                      className="opacity-0 group-hover/lane:opacity-100 w-3 h-3 bg-red-900/80 rounded-sm flex items-center justify-center hover:bg-red-700 transition-all duration-200"
                      title={`Delete Sound Lane ${laneIndex + 1}`}
                    >
                      <i className="ri-delete-bin-7-line text-[7px] text-red-300 hover:text-white"></i>
                    </button>
                  )}
                </div>
                <button 
                  onClick={() => onAddSoundToLane?.(laneIndex)}
                  className="h-6 bg-black rounded flex items-center justify-center gap-1.5 hover:bg-gray-900 transition-colors group/add min-w-[60px] px-2"
                >
                  <i className="ri-music-line text-[10px] text-[#38f47cf9] group-hover/add:text-white"></i>
                  <span className="text-[10px] text-[#38f47cf9] group-hover/add:text-white">Add</span>
                </button>
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
                isDragTarget={dragTargetLane?.laneType === 'video' && dragTargetLane?.laneIndex === laneIndex}
                ghostPreview={getGhostPreviewForLane('video', laneIndex)}
                ghostIsReplacing={isGhostReplacingForLane('video', laneIndex)}
                ghostReplaceTargetId={getGhostReplaceTargetIdForLane('video', laneIndex)}
              />
            ))}

            {/* Video New Lane Dropzone */}
            {isDragging && activeClipType === 'video' && newLaneTargetType === 'video' && canAddNewVideoLane(videoLanes) && (
              <div className="relative h-6 border-b border-gray-800/70">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="px-2 py-0.5 text-[10px] rounded bg-sky-900/40 border border-sky-500/50 text-sky-300">
                    + New Video Lane (drop to create)
                  </div>
                </div>
              </div>
            )}

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
                isDragTarget={dragTargetLane?.laneType === 'text' && dragTargetLane?.laneIndex === laneIndex}
                ghostPreview={getGhostPreviewForLane('text', laneIndex)}
                ghostIsReplacing={isGhostReplacingForLane('text', laneIndex)}
                ghostReplaceTargetId={getGhostReplaceTargetIdForLane('text', laneIndex)}
              />
            ))}

            {/* Text New Lane Dropzone */}
            {isDragging && activeClipType === 'text' && newLaneTargetType === 'text' && canAddNewTextLane(textLanes) && (
              <div className="relative h-6 border-b border-gray-800/70">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="px-2 py-0.5 text-[10px] rounded bg-sky-900/40 border border-sky-500/50 text-sky-300">
                    + New Text Lane (drop to create)
                  </div>
                </div>
              </div>
            )}

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
                isDragTarget={dragTargetLane?.laneType === 'sound' && dragTargetLane?.laneIndex === laneIndex}
                ghostPreview={getGhostPreviewForLane('sound', laneIndex)}
                ghostIsReplacing={isGhostReplacingForLane('sound', laneIndex)}
                ghostReplaceTargetId={getGhostReplaceTargetIdForLane('sound', laneIndex)}
              />
            ))}

            {/* Sound New Lane Dropzone */}
            {isDragging && activeClipType === 'sound' && newLaneTargetType === 'sound' && canAddNewLane(soundLanes) && (
              <div className="relative h-6">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="px-2 py-0.5 text-[10px] rounded bg-sky-900/40 border border-sky-500/50 text-sky-300">
                    + New Sound Lane (drop to create)
                  </div>
                </div>
              </div>
            )}

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