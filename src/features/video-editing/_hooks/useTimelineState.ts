/**
 * useTimelineState - 타임라인 상태 관리 커스텀 훅 🎮
 * 
 * 📌 주요 역할:
 * 1. 줌 레벨 및 픽셀-시간 변환 관리
 * 2. 클립 선택 상태와 Context 동기화
 * 3. 드래그/리사이즈 활성 클립 상태 관리  
 * 4. 레인 타겟팅 및 드롭존 상태 관리
 * 5. 타임라인 시간 계산 및 마커 생성
 * 6. 사용자 선호도 기반 겹침 처리
 * 
 * 🎯 핵심 특징:
 * - Context와 로컬 상태를 브리지하여 일관성 유지
 * - 줌 레벨 변경에 따른 픽셀-시간 변환 자동화
 * - 드래그 중 타겟 레인과 마우스 위치 실시간 추적
 * - 새 레인 생성을 위한 드롭존 감지 로직
 * - 유효한 드래그 타겟 복원을 위한 레인 히스토리 관리
 * 
 * 💡 사용법:
 * ```tsx
 * const timelineState = useTimelineState({
 *   clips: videoClips,
 *   textClips: textClips,
 *   soundClips: soundClips,
 *   currentTime: 30,
 *   totalDuration: 180
 * });
 * 
 * // 줌 변경
 * timelineState.handleZoomChange('in');
 * 
 * // 클립 선택
 * timelineState.selectClip('clip-1', 'video');
 * ```
 */
import { useState, useCallback, useRef } from 'react';
import { VideoClip, TextClip, SoundClip } from '@/shared/types/video-editor';
import { useClips } from '@/app/video-editor/_context/Providers';
import { calculateTimelineDuration, generateTimeMarkers } from '@/features/video-editing/_utils/common-clip-utils';
import { useUserPreferences } from '@/shared/hooks/useUserPreferences';

/**
 * useTimelineState 훅 옵션 인터페이스 ⚙️
 * 
 * 📋 옵션 그룹별 설명:
 * 
 * 🎚️ **줌 및 시간 설정**:
 * - initialPixelsPerSecond: 초기 줌 레벨 (기본: 40px/초)
 * - totalDuration: 외부에서 제공된 총 시간
 * - currentTime: 현재 재생 시간
 * 
 * 📦 **클립 데이터**:
 * - clips, textClips, soundClips: 각 타입별 클립 배열
 * 
 * 🛤️ **레인 구성**:
 * - videoLanes, textLanes, soundLanes: 활성 레인 인덱스 배열
 */
interface UseTimelineStateOptions {
  /** 🎚️ 초기 줌 레벨 (픽셀/초) - 예: 40 = 1초당 40픽셀 표시 */
  initialPixelsPerSecond?: number;
  /** ⏱️ 외부에서 제공된 총 시간 (초) - 없으면 클립 길이로 자동 계산 */
  totalDuration?: number;
  /** 현재 재생 시간 (초) - 재생헤드 위치 계산용 */
  currentTime?: number;
  
  /** 📹 비디오 클립 데이터 배열 */
  clips: VideoClip[];
  /** 📝 텍스트 클립 데이터 배열 */
  textClips: TextClip[];
  /** 🔊 사운드 클립 데이터 배열 */
  soundClips: SoundClip[];
  
  /** 🛤️ 활성 비디오 레인 인덱스들 - 예: [0, 1, 2] */
  videoLanes: number[];
  /** 🛤️ 활성 텍스트 레인 인덱스들 - 예: [0, 1] */
  textLanes: number[];
  /** 🛤️ 활성 사운드 레인 인덱스들 - 예: [0, 1, 2] */
  soundLanes: number[];
}

/**
 * useTimelineState 훅 반환값 인터페이스 📤
 * 
 * 📋 반환값 그룹별 설명:
 * 
 * 🎚️ **줌 및 시간 계산**:
 * - pixelsPerSecond: 현재 줌 레벨
 * - totalDurationInSeconds: 계산된 총 시간
 * - timeMarkers: 시간 마커 배열 (10초 단위)
 * - handleZoomChange: 줌 변경 함수
 * 
 * 🎯 **클립 선택 상태**:
 * - selectedClipId/Type: 현재 선택된 클립 정보
 * - multiSelectedClips: 다중 선택된 클립들
 * - selectClip, clearSelection: 선택 관리 함수들
 * 
 * 🖱️ **드래그 & 드롭 상태**:
 * - activeClip/Type: 현재 드래그/리사이즈 중인 클립
 * - dragTargetLane: 드래그 타겟 레인 정보
 * - lastMouseX/Y: 마우스 위치 (고스트 프리뷰용)
 * 
 * 🎨 **사용자 경험**:
 * - askReplaceOnOverlap: 겹침 처리 모달 함수
 */
interface UseTimelineStateReturn {
  // 🎚️ 줌 및 시간 계산 관련
  /** 📏 현재 줌 레벨 (픽셀/초) */
  pixelsPerSecond: number;
  /** 📏 줌 레벨 설정 함수 */
  setPixelsPerSecond: (value: number | ((prev: number) => number)) => void;
  /** ⏱️ 계산된 총 시간 (초) - 클립 길이 기반 */
  totalDurationInSeconds: number;
  /** 📐 타임라인 표시 길이 (초) - 최소 3분 + 버퍼 */
  timelineLengthInSeconds: number;
  /** 📊 시간 마커 배열 - 10초 단위 표시용 */
  timeMarkers: string[];
  /** 재생헤드 픽셀 위치 */
  playheadPosition: number;
  /** 🔍 줌 변경 함수 (50%~200% 범위) */
  handleZoomChange: (direction: 'in' | 'out') => void;
  
  // 🎯 클립 선택 상태 (Context 브리지)
  /** 🎯 현재 선택된 클립 ID */
  selectedClipId: string | null;
  /** 🎯 현재 선택된 클립 타입 */
  selectedClipType: 'video' | 'text' | 'sound' | null;
  /** 🎯 다중 선택된 클립들 */
  multiSelectedClips: Array<{id: string; type: 'video' | 'text' | 'sound'}>;
  /** 🎯 드래그 선택으로 선택된 클립들 (별칭) */
  rectSelectedClips: Array<{id: string; type: 'video' | 'text' | 'sound'}>;
  /** 🎯 선택된 클립 ID (레거시 호환성) */
  selectedClip: string | null;
  /** 🎯 클립 선택 함수 */
  selectClip: (clipId: string, clipType: 'video' | 'text' | 'sound') => void;
  /** 🎯 선택 해제 함수 */
  clearSelection: () => void;
  /** 🎯 드래그 선택 결과 설정 함수 */
  setRectSelectedClips: (clips: Array<{id: string; type: 'video' | 'text' | 'sound'}>) => void;
  
  // 🖱️ 활성 클립 상태 (드래그/리사이즈용)
  /** 🖱️ 현재 활성(드래그/리사이즈 중) 클립 ID */
  activeClip: string | null;
  /** 🖱️ 현재 활성 클립 타입 */
  activeClipType: 'video' | 'text' | 'sound' | null;
  /** 🖱️ 활성 클립 정보 설정 함수 */
  setActiveClipInfo: (clipId: string | null, clipType: 'video' | 'text' | 'sound' | null) => void;
  
  // 🛤️ 드래그 타겟 레인 상태
  /** 🛤️ 현재 드래그 타겟 레인 정보 */
  dragTargetLane: { laneIndex: number; laneType: 'video' | 'text' | 'sound' } | null;
  /** 🛤️ 드래그 타겟 레인 설정 함수 */
  setDragTargetLane: (lane: { laneIndex: number; laneType: 'video' | 'text' | 'sound' } | null) => void;
  /** 🛤️ 마지막 호버된 레인 (복원용) */
  lastHoverLane: { laneIndex: number; laneType: 'video' | 'text' | 'sound' } | null;
  /** 🛤️ 마지막 호버 레인 설정 함수 */
  setLastHoverLane: (lane: { laneIndex: number; laneType: 'video' | 'text' | 'sound' } | null) => void;
  /** 🛤️ 최신 유효 레인 ref (동기적 접근용) */
  latestValidLaneRef: React.MutableRefObject<{ laneIndex: number; laneType: 'video' | 'text' | 'sound' } | null>;
  
  // 🖱️ 마우스 위치 및 드롭존 상태
  /** 🖱️ 마지막 마우스 X 좌표 (고스트 프리뷰용) */
  lastMouseX: number | null;
  /** 🖱️ 마우스 X 좌표 설정 함수 */
  setLastMouseX: (x: number | null) => void;
  /** 🖱️ 마지막 마우스 Y 좌표 */
  lastMouseY: number | null;
  /** 🖱️ 마우스 Y 좌표 설정 함수 */
  setLastMouseY: (y: number | null) => void;
  /** 🆕 새 레인 드롭존 타겟 타입 */
  newLaneTargetType: 'video' | 'text' | 'sound' | null;
  /** 🆕 새 레인 타겟 타입 설정 함수 */
  setNewLaneTargetType: (type: 'video' | 'text' | 'sound' | null) => void;
  
  // 🎨 사용자 선호도 및 겹침 처리
  /** 🎨 겹침 시 교체 여부 확인 함수 (모달 포함) */
  askReplaceOnOverlap: () => Promise<boolean>;
}

/**
 * 타임라인 상태 관리 커스텀 훅 메인 함수 🎮
 * 
 * 📌 동작 과정:
 * 1. 사용자 선호도 로드 (겹침 처리 설정)
 * 2. Context에서 클립 선택 상태 가져오기
 * 3. 로컬 상태 초기화 (줌, 드래그, 마우스 등)
 * 4. 시간 계산 및 마커 생성
 * 5. 브리지 함수들로 Context-로컬 상태 연결
 * 6. 통합된 상태 객체 반환
 * 
 * 🎯 핵심 최적화:
 * - useCallback으로 함수 메모화
 * - ref 사용으로 동기적 상태 접근
 * - Context 상태와 로컬 상태 분리로 리렌더링 최소화
 */
export function useTimelineState({
  initialPixelsPerSecond = 40,
  totalDuration,
  currentTime = 0,
  clips,
  textClips,
  soundClips,
}: UseTimelineStateOptions): UseTimelineStateReturn {
  
  // 🎨 사용자 겹침 교체 기본 설정 로드
  const { profile } = useUserPreferences();
  
  // 🎚️ 줄 레벨 상태 (50%~200% 범위, 기본 40px/초)
  const [pixelsPerSecond, setPixelsPerSecond] = useState(initialPixelsPerSecond);
  
  // 🎯 Context에서 클립 선택 상태 가져오기 (전역 상태)
  const {
    selectedClipId,          // 현재 선택된 클립 ID
    selectedClipType,        // 선택된 클립 타입 (video/text/sound)
    multiSelectedClips,      // 다중 선택된 클립들 배열
    handleSelectClip,        // 클립 선택 함수
    handleClearSelection,    // 선택 해제 함수
    handleSetMultiSelectedClips, // 다중 선택 설정 함수
  } = useClips();
  
  // 🖱️ 활성 클립 상태 (현재 드래그/리사이즈 중인 클립)
  const [activeClip, setActiveClip] = useState<string | null>(null);
  const [activeClipType, setActiveClipType] = useState<'video' | 'text' | 'sound' | null>(null);
  
  // 🛤️ 드래그 타겟 레인 및 마우스 위치 상태들
  /** 현재 드래그 중인 클립이 타겟으로 하는 레인 정보 */
  const [dragTargetLane, setDragTargetLane] = useState<{ laneIndex: number; laneType: 'video' | 'text' | 'sound' } | null>(null);
  /** 드래그 중 마지막 마우스 X 좌표 (고스트 프리뷰 위치 계산용) */
  const [lastMouseX, setLastMouseX] = useState<number | null>(null);
  /** 드래그 중 마지막 마우스 Y 좌표 (레인 감지용) */
  const [lastMouseY, setLastMouseY] = useState<number | null>(null);
  /** 새 레인 드롭존에서 감지된 클립 타입 */
  const [newLaneTargetType, setNewLaneTargetType] = useState<'video' | 'text' | 'sound' | null>(null);
  /** 마지막으로 호버된 유효 레인 (마우스 업 시 복원용) */
  const [lastHoverLane, setLastHoverLane] = useState<{ laneIndex: number; laneType: 'video' | 'text' | 'sound' } | null>(null);
  
  // 📌 최신 레인 정보를 동기적으로 저장하기 위한 ref
  // 드래그 중 실시간으로 변하는 레인 정보를 비동기 함수에서도 접근 가능하게 함
  const latestValidLaneRef = useRef<{ laneIndex: number; laneType: 'video' | 'text' | 'sound' } | null>(null);
  
  /**
   * 겹침 교체 여부를 비동기적으로 결정하는 함수 🎨
   * 
   * 📌 동작 과정:
   * 1. 사용자 설정 확인 (always_replace/never_replace/ask)
   * 2. 'always_replace'면 즉시 true 반환
   * 3. 'never_replace'면 즉시 false 반환  
   * 4. 그 외(ask)는 모달을 열어 사용자에게 확인 요청
   * 
   * 🎯 사용 사례:
   * - 클립 드래그 중 기존 클립과 겹칠 때
   * - 사용자의 의도를 확인하여 UX 개선
   * - 설정에 따라 자동 처리 가능
   * 
   * @returns Promise<boolean> - true: 교체, false: 새 위치 찾기
   */
  const askReplaceOnOverlap = useCallback(async (): Promise<boolean> => {
    // 🔧 사용자 설정에 따른 자동 처리
    if (profile?.overlap_replace_preference === 'always_replace') return true;
    if (profile?.overlap_replace_preference === 'never_replace') return false;
    
    // 🎭 모달을 통한 사용자 확인 요청 (CustomEvent 방식)
    return await new Promise<boolean>((resolve) => {
      const resolver = (result: { replace: boolean }) => resolve(result.replace);
      const event = new CustomEvent('openOverlapReplaceConfirm', { detail: { resolver } });
      window.dispatchEvent(event);
    });
  }, [profile?.overlap_replace_preference]);
  
  /**
   * 줌 레벨 변경 핸들러 🔍
   * 
   * 📌 줌 제한 사항:
   * - 최소: 50% (20px/초) - 너무 축소되면 클립 구분 어려움
   * - 최대: 200% (80px/초) - 너무 확대되면 전체 보기 어려움
   * - 단계: 10% 단위 조절로 부드러운 사용자 경험
   * 
   * 🎯 동작 과정:
   * 1. 현재 줌 레벨을 퍼센트로 변환 (40px/초 = 100%)
   * 2. 방향에 따라 10% 증가/감소
   * 3. 최소/최대 범위 내로 제한
   * 4. 퍼센트를 다시 픽셀/초로 변환하여 반영
   * 
   * @param direction - 'in': 확대(줌 인), 'out': 축소(줌 아웃)
   */
  const handleZoomChange = useCallback((direction: 'in' | 'out') => {
    setPixelsPerSecond(prev => {
      const basePixelsPerSecond = 40; // 🎚️ 기본값 (100% = 40px/초)
      const currentPercent = (prev / basePixelsPerSecond) * 100; // 현재 줌을 %로 변환
      const zoomStep = 10; // 📏 10% 단위로 조절
      const minPercent = 50;  // 🔒 최소 50% (축소 제한)
      const maxPercent = 200; // 🔒 최대 200% (확대 제한)
      
      let newPercent: number;
      if (direction === 'in') {
        // 🔍 줌 인 (확대) - 10% 증가
        newPercent = Math.min(maxPercent, currentPercent + zoomStep);
      } else {
        // 🔍 줌 아웃 (축소) - 10% 감소
        newPercent = Math.max(minPercent, currentPercent - zoomStep);
      }
      
      // 🔄 퍼센트를 픽셀/초로 변환하여 반환
      return Math.round((newPercent / 100) * basePixelsPerSecond);
    });
  }, []);
  
  // ⏱️ 시간 계산 섹션
  const basePixelsPerSecond = 40; // 📏 기준 픽셀/초 (100% 줌 레벨)
  // 📊 실제 컨텐츠 총 시간 계산 (외부 제공 또는 클립 길이로 자동 계산)
  const totalDurationInSeconds = totalDuration ?? calculateTimelineDuration(clips, textClips, soundClips, basePixelsPerSecond);
  const minimumDuration = 180; // 🕐 180초 (3분) - 타임라인 최소 표시 시간
  const bufferTime = 10; // 📦 10초 버퍼 (끝부분 여유 공간)
  // 📐 실제 타임라인 표시 길이 (최소 3분, 컨텐츠 길이 + 버퍼 중 큰 값)
  const timelineLengthInSeconds = Math.max(minimumDuration, Math.ceil(totalDurationInSeconds + bufferTime));
  
  // 📊 시간 마커 및 재생헤드 위치 계산
  const timeMarkers = generateTimeMarkers(timelineLengthInSeconds); // 10초 단위 마커 생성
  const playheadPosition = currentTime * pixelsPerSecond; // 재생헤드 픽셀 위치
  
  // 🌉 Context와 로컬 상태 브리지 함수들
  // 전역 Context 상태와 로컬 상태를 연결하는 래퍼 함수들
  
  /** 🎯 클립 선택 함수 (Context로 전달) */
  const selectClip = useCallback((clipId: string, clipType: 'video' | 'text' | 'sound') => {
    handleSelectClip(clipId, clipType);
  }, [handleSelectClip]);
  
  /** 🎯 선택 해제 함수 (Context로 전달) */
  const clearSelection = useCallback(() => {
    handleClearSelection();
  }, [handleClearSelection]);
  
  /** 🖱️ 활성 클립 정보 설정 함수 (드래그/리사이즈용) */
  const setActiveClipInfo = useCallback((clipId: string | null, clipType: 'video' | 'text' | 'sound' | null) => {
    setActiveClip(clipId);        // 활성 클립 ID 설정
    setActiveClipType(clipType);  // 활성 클립 타입 설정
  }, []);
  
  const setRectSelectedClips = useCallback((clips: Array<{id: string; type: 'video' | 'text' | 'sound'}>) => {
    // 드래그 선택 결과를 Context의 multiSelectedClips에 업데이트
    handleSetMultiSelectedClips(clips);
  }, [handleSetMultiSelectedClips]);
  
  // Legacy 호환성을 위한 별칭
  const rectSelectedClips = multiSelectedClips;
  const selectedClip = selectedClipId;
  
  return {
    // 줌 및 시간 계산
    pixelsPerSecond,
    setPixelsPerSecond,
    totalDurationInSeconds,
    timelineLengthInSeconds,
    timeMarkers,
    playheadPosition,
    handleZoomChange,
    
    // 클립 선택 상태
    selectedClipId,
    selectedClipType,
    multiSelectedClips,
    rectSelectedClips,
    selectedClip,
    selectClip,
    clearSelection,
    setRectSelectedClips,
    
    // 활성 클립 상태
    activeClip,
    activeClipType,
    setActiveClipInfo,
    
    // 드래그 타겟 레인 상태
    dragTargetLane,
    setDragTargetLane,
    lastHoverLane,
    setLastHoverLane,
    latestValidLaneRef,
    
    // 마우스 위치 및 드롭존 상태
    lastMouseX,
    setLastMouseX,
    lastMouseY,
    setLastMouseY,
    newLaneTargetType,
    setNewLaneTargetType,
    
    // 사용자 선호도
    askReplaceOnOverlap,
  };
}