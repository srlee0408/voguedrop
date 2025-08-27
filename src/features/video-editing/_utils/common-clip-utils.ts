/**
 * 통합 타임라인 유틸리티
 * 
 * 이 파일은 비디오 에디터의 모든 타임라인 관련 기능을 통합합니다:
 * - 클립 조작 (드래그, 리사이즈, 분할, 복제)
 * - 클립 배치 및 충돌 처리 (연쇄 충돌 지원)
 * - 시간 계산 및 포맷팅
 * - 검색, 필터링, 유틸리티 함수들
 * 
 * @author Video Editor Team
 * @version 2.0.0 - 통합 버전
 */

import { VideoClip, TextClip, SoundClip } from '@/shared/types/video-editor';

// ===== 타입 정의 =====

/**
 * 공통 클립 인터페이스 - 모든 클립 타입의 기본 속성
 */
export interface BaseClip {
  id: string;
  duration: number;
  position: number;
  maxDuration?: number;
  laneIndex?: number;
}

// 공통 클립 타입 정의
export type CommonClip = VideoClip | TextClip | SoundClip;
export type ClipType = 'video' | 'text' | 'sound';

// 클립 타입별 배열 타입
export type ClipArrays = {
  video: VideoClip[];
  text: TextClip[];
  sound: SoundClip[];
};

// 클립 업데이트 함수 타입
export type UpdateFunctions = {
  video: (clips: VideoClip[]) => void;
  text: (clips: TextClip[]) => void;
  sound: (clips: SoundClip[]) => void;
};

// 드래그 타겟 레인 정보
export interface DragTargetLane {
  laneIndex: number;
  laneType: ClipType;
}

// ===== 기본 유틸리티 함수들 =====

/**
 * 클립 겹침 확인
 * @param clips 확인할 클립 배열
 * @param clipId 이동 중인 클립 ID
 * @param newPosition 새 위치
 * @param duration 클립 길이
 * @returns 겹침 여부
 */
export const checkClipOverlap = <T extends BaseClip>(
  clips: T[],
  clipId: string,
  newPosition: number,
  duration: number
): boolean => {
  return clips.some(clip => 
    clip.id !== clipId &&
    newPosition < clip.position + clip.duration &&
    newPosition + duration > clip.position
  );
};

/**
 * 주어진 위치에서 겹치는 클립들 반환
 * @param clips 확인할 클립 배열 (대상 레인의 클립들 권장)
 * @param excludeClipId 제외할 클립 ID (보통 드래그 중인 클립)
 * @param newPosition 새 위치
 * @param duration 클립 길이
 */
export const getOverlappedClips = <T extends BaseClip>(
  clips: T[],
  excludeClipId: string | null,
  newPosition: number,
  duration: number
): T[] => {
  const start = Math.max(0, newPosition);
  const end = start + duration;
  return clips.filter(clip => {
    if (excludeClipId && clip.id === excludeClipId) return false;
    const clipStart = clip.position;
    const clipEnd = clip.position + clip.duration;
    return start < clipEnd && end > clipStart;
  });
};

/**
 * 겹침 비율의 최대값 계산 (드래그된 클립 길이 기준)
 * @returns { maxRatio, overlappedClips }
 */
export const getMaxOverlapRatio = <T extends BaseClip>(
  clips: T[],
  excludeClipId: string | null,
  newPosition: number,
  duration: number
): { maxRatio: number; overlappedClips: T[] } => {
  const overlappedClips = getOverlappedClips(clips, excludeClipId, newPosition, duration);
  const start = Math.max(0, newPosition);
  const end = start + duration;
  let maxRatio = 0;
  for (const clip of overlappedClips) {
    const clipStart = clip.position;
    const clipEnd = clip.position + clip.duration;
    const overlap = Math.min(end, clipEnd) - Math.max(start, clipStart);
    const ratio = overlap > 0 ? overlap / duration : 0;
    if (ratio > maxRatio) maxRatio = ratio;
  }
  return { maxRatio, overlappedClips };
};

/**
 * 겹침으로 교체 트리거 임계값 (40%)
 */
export const OVERLAP_REPLACE_THRESHOLD = 0.4;

/**
 * 최대 겹침 대상 클립과 비율 계산
 * 두 클립 이상과 겹칠 때 더 많이 겹치는 하나를 선택
 */
export const getMaxOverlapTarget = <T extends BaseClip>(
  clips: T[],
  excludeClipId: string | null,
  newPosition: number,
  duration: number
): { target: T | null; ratio: number } => {
  const start = Math.max(0, newPosition);
  const end = start + duration;
  let best: { target: T | null; ratio: number } = { target: null, ratio: 0 };
  for (const clip of clips) {
    if (excludeClipId && clip.id === excludeClipId) continue;
    const clipStart = clip.position;
    const clipEnd = clip.position + clip.duration;
    if (start < clipEnd && end > clipStart) {
      const overlap = Math.min(end, clipEnd) - Math.max(start, clipStart);
      const ratio = overlap > 0 ? overlap / duration : 0;
      if (ratio > best.ratio) best = { target: clip, ratio };
    }
  }
  return best;
};

/**
 * 클립 길이 검증
 * @param duration 현재 길이
 * @param maxDuration 최대 허용 길이
 * @returns 유효한 길이
 */
export const validateClipDuration = (
  duration: number,
  maxDuration?: number
): number => {
  const minDuration = 80; // 최소 클립 너비 (픽셀)
  let validDuration = Math.max(minDuration, duration);
  
  if (maxDuration !== undefined && maxDuration > 0) {
    validDuration = Math.min(validDuration, maxDuration);
  }
  
  return validDuration;
};

/**
 * 클립 위치 검증
 * @param position 요청된 위치
 * @param duration 클립 길이
 * @param timelineWidth 타임라인 전체 너비
 * @returns 유효한 위치
 */
export const validateClipPosition = (
  position: number,
  duration: number,
  timelineWidth?: number
): number => {
  // 음수 위치 방지
  let validPosition = Math.max(0, position);
  
  // 타임라인 너비가 제공된 경우, 클립이 타임라인을 벗어나지 않도록 제한
  if (timelineWidth !== undefined && timelineWidth > 0) {
    const maxPosition = Math.max(0, timelineWidth - duration);
    validPosition = Math.min(validPosition, maxPosition);
  }
  
  return validPosition;
};

/**
 * 타임라인 끝 위치 계산
 * @param clips 클립 배열
 * @returns 마지막 클립의 끝 위치
 */
export const getTimelineEnd = <T extends BaseClip>(clips: T[]): number => {
  if (clips.length === 0) return 0;
  
  return clips.reduce((max, clip) => {
    const clipEnd = clip.position + clip.duration;
    return Math.max(max, clipEnd);
  }, 0);
};

/**
 * 다음 사용 가능한 위치 계산
 * @param clips 클립 배열
 * @returns 다음 사용 가능한 위치
 */
export const getNextAvailablePosition = <T extends BaseClip>(
  clips: T[]
): number => {
  if (clips.length === 0) return 0;
  
  const lastClipEnd = Math.max(
    ...clips.map(clip => clip.position + clip.duration)
  );
  
  return lastClipEnd; // 클립 간 간격 없이 배치
};

// ===== 핵심 클립 배치 로직 =====

/**
 * 통합 클립 배치 로직 - 모든 클립 타입에 동일하게 적용
 * 연쇄 충돌(ripple effect) 지원으로 프리미어 프로와 같은 동작
 * @param clips 모든 클립 배열 (드래그 중인 클립 포함)
 * @param draggedClipId 드래그 중인 클립 ID
 * @param requestedPosition 배치하려는 위치
 * @param duration 클립 길이
 * @returns 대상 위치와 조정된 클립 배열
 */
export const magneticPositioning = <T extends BaseClip>(
  clips: T[],
  draggedClipId: string,
  requestedPosition: number,
  duration: number
): { targetPosition: number; adjustedClips: T[] } => {
  // 드래그된 클립 제외한 클립들을 position 순으로 정렬
  const otherClips = clips.filter(c => c.id !== draggedClipId);
  const sortedClips = [...otherClips].sort((a, b) => a.position - b.position);
  
  // 클립이 없으면 그냥 요청 위치에 배치
  if (sortedClips.length === 0) {
    return { targetPosition: Math.max(0, requestedPosition), adjustedClips: [] };
  }
  
  // 드래그된 클립의 중심과 끝점
  const draggedCenter = requestedPosition + (duration / 2);
  const draggedEnd = requestedPosition + duration;
  
  // 1. 두 클립 사이에 있는지 확인
  for (let i = 0; i < sortedClips.length - 1; i++) {
    const leftClip = sortedClips[i];
    const rightClip = sortedClips[i + 1];
    
    const leftEnd = leftClip.position + leftClip.duration;
    const rightStart = rightClip.position;
    
    // 드래그한 클립이 두 클립 사이 공간과 관련이 있는지 확인
    const isInBetween = 
      (draggedCenter >= leftEnd && draggedCenter <= rightStart) || // 중심이 사이에
      (requestedPosition >= leftEnd && requestedPosition <= rightStart) || // 시작이 사이에
      (draggedEnd >= leftEnd && draggedEnd <= rightStart) || // 끝이 사이에
      (requestedPosition <= leftEnd && draggedEnd >= rightStart); // 공간을 완전히 덮음
    
    if (isInBetween) {
      const gap = rightStart - leftEnd;
      
      if (gap >= duration) {
        // 공간이 충분하면 사용자가 드래그한 위치에 배치
        let finalPosition = requestedPosition;
        
        // 왼쪽 클립과 겹치는 경우 조정
        if (finalPosition < leftEnd) {
          finalPosition = leftEnd;
        }
        
        // 오른쪽 클립과 겹치는 경우 조정
        if (finalPosition + duration > rightStart) {
          finalPosition = rightStart - duration;
        }
        
        return {
          targetPosition: finalPosition,
          adjustedClips: otherClips
        };
      } else {
        // 공간이 부족하면 중심 기준으로 좌/우 배치 (밀림 없이)
        const leftClip = sortedClips[i];
        const rightClip = sortedClips[i + 1];
        const gapCenter = (leftClip.position + leftClip.duration + rightClip.position) / 2;
        
        if (draggedCenter > gapCenter) {
          // 오른쪽 클립 우측에 배치
          return {
            targetPosition: rightClip.position + rightClip.duration,
            adjustedClips: otherClips
          };
        } else {
          // 왼쪽 클립 좌측에 배치
          const leftPos = leftClip.position - duration;
          return {
            targetPosition: Math.max(0, leftPos),
            adjustedClips: otherClips
          };
        }
      }
    }
  }
  
  // 2. 맨 앞에 놓으려는 경우
  if (draggedEnd <= sortedClips[0].position) {
    return {
      targetPosition: Math.max(0, requestedPosition),
      adjustedClips: otherClips
    };
  }
  
  // 3. 맨 앞 클립과 겹치는 경우 - 중심 기준으로 좌/우 배치 (밀림 없이)
  if (requestedPosition < sortedClips[0].position && draggedEnd > sortedClips[0].position) {
    const firstClip = sortedClips[0];
    const firstClipCenter = firstClip.position + (firstClip.duration / 2);
    
    if (draggedCenter > firstClipCenter) {
      // 오른쪽에 배치
      return {
        targetPosition: firstClip.position + firstClip.duration,
        adjustedClips: otherClips
      };
    } else {
      // 왼쪽에 배치 (0 이상으로 제한)
      const leftPos = firstClip.position - duration;
      return {
        targetPosition: Math.max(0, leftPos),
        adjustedClips: otherClips
      };
    }
  }
  
  // 4. 단일 클립 위에 있는 경우 - 중심 기준 좌/우 배치 (밀림 현상 없이)
  const overlappingClip = sortedClips.find(clip =>
    requestedPosition < clip.position + clip.duration &&
    draggedEnd > clip.position
  );
  
  if (overlappingClip) {
    const clipCenter = overlappingClip.position + (overlappingClip.duration / 2);
    
    if (draggedCenter > clipCenter) {
      // 오른쪽에 배치 - 겹침 없이 바로 우측에 붙임
      return {
        targetPosition: overlappingClip.position + overlappingClip.duration,
        adjustedClips: otherClips
      };
    } else {
      // 왼쪽에 배치 - 겹침 없이 바로 좌측에 붙임
      const leftPos = overlappingClip.position - duration;
      
      // 0보다 작으면 0으로 제한 (밀림 현상 없이)
      const finalLeftPos = Math.max(0, leftPos);
      
      return {
        targetPosition: finalLeftPos,
        adjustedClips: otherClips
      };
    }
  }
  
  // 5. 빈 공간에 배치
  return {
    targetPosition: Math.max(0, requestedPosition),
    adjustedClips: otherClips
  };
};

// ===== 핵심 클립 조작 함수들 =====

/**
 * 공통 클립 드래그 처리 로직
 */
export function handleClipDrag<T extends CommonClip>(
  activeClipId: string,
  clipType: ClipType,
  currentClips: T[],
  delta: number,
  dragTargetLane: DragTargetLane | null,
  updateFunction: (clips: T[]) => void,
  options?: { replaceOnOverlap?: boolean; timelineWidth?: number }
): void {
  const currentClip = currentClips.find(c => c.id === activeClipId);
  if (!currentClip) return;

  // delta는 내부 기준(px, 40px/sec)에 맞춰 전달되어야 함
  const newPosition = Math.max(0, currentClip.position + delta);
  
  // 레인 변경 감지 (laneType 매칭 안 되더라도 우선 laneIndex가 있으면 해당 레인 적용)
  const originalLane = currentClip.laneIndex ?? 0;
  const targetLane = dragTargetLane ? dragTargetLane.laneIndex : originalLane;
  
  const timelineWidth = options?.timelineWidth;
  const validatedPosition = validateClipPosition(newPosition, currentClip.duration, timelineWidth);

  // 대상 레인의 (active 제외) 클립들
  const laneClips = currentClips.filter(c => c.id !== activeClipId && (c.laneIndex ?? 0) === targetLane);

  // 겹침 교체 옵션 처리 (가장 많이 겹치는 단일 대상만 교체)
  if (options?.replaceOnOverlap) {
    const { target } = getMaxOverlapTarget(laneClips, activeClipId, validatedPosition, currentClip.duration);
    if (target) {
      const withoutTarget = currentClips.filter(c => c.id !== target.id);
      const replaced = withoutTarget.map(c => {
        if (c.id === activeClipId) {
          return { ...c, laneIndex: targetLane, position: validatedPosition } as T;
        }
        return c;
      });
      updateFunction(replaced.sort((a, b) => a.position - b.position));
      return;
    }
  }

  // 겹침이 없거나 교체 모드가 아닐 때: 자석 배치로 겹침 회피
  if (targetLane !== originalLane) {
    const { targetPosition } = magneticPositioning(
      laneClips,
      activeClipId,
      validatedPosition,
      currentClip.duration
    );

    const updatedClips = currentClips.map(c => {
      if (c.id === activeClipId) {
        return { ...c, laneIndex: targetLane, position: targetPosition } as T;
      }
      return c;
    });

    updateFunction(updatedClips.sort((a, b) => a.position - b.position));
  } else {
    const sameLaneClips = laneClips; // 동일 레인
    const { targetPosition } = magneticPositioning(
      sameLaneClips,
      activeClipId,
      validatedPosition,
      currentClip.duration
    );

    const updatedClips = currentClips.map(c => {
      if (c.id === activeClipId) {
        return { ...c, position: targetPosition } as T;
      }
      return c;
    });

    updateFunction(updatedClips.sort((a, b) => a.position - b.position));
  }
}

/**
 * 공통 클립 리사이즈 처리 로직
 */
export function handleClipResize<T extends CommonClip>(
  clipId: string,
  clipType: ClipType,
  currentClips: T[],
  newWidth: number,
  newPosition: number,
  resizeHandle: 'left' | 'right',
  updatePositionFunction?: (id: string, position: number) => void,
  resizeFunction?: (id: string, duration: number, handle?: 'left' | 'right', deltaPosition?: number) => void
): void {
  const currentClip = currentClips.find(c => c.id === clipId);
  if (!currentClip) return;

  const startPosition = currentClip.position;
  
  // 위치 업데이트 (left handle인 경우)
  if (resizeHandle === 'left' && updatePositionFunction) {
    // 좌측 핸들 조정 시 먼저 DOM에서 계산된 최종 position을 상태에 반영
    updatePositionFunction(clipId, newPosition);
  }
  
  // 리사이즈 함수 호출 (start/endTime 트림 로직은 각 Context에서 처리됨)
  if (resizeFunction) {
    const deltaPosition = resizeHandle === 'left' ? newPosition - startPosition : 0;
    resizeFunction(clipId, newWidth, resizeHandle, deltaPosition);
  }
}

/**
 * 공통 클립 복제 로직 (새 ID와 위치로 복제)
 */
export function duplicateClip<T extends CommonClip>(
  clipId: string,
  currentClips: T[],
  updateFunction: (clips: T[]) => void
): void {
  const clip = currentClips.find(c => c.id === clipId);
  if (!clip) return;

  // 해당 레인의 기존 클립들 중 가장 뒤에 배치하기 위한 위치 계산
  const currentLane = clip.laneIndex ?? 0;
  const sameLaneClips = currentClips.filter(c => (c.laneIndex ?? 0) === currentLane);
  const lastClip = sameLaneClips.reduce((latest, current) => 
    current.position + current.duration > latest.position + latest.duration ? current : latest
  , sameLaneClips[0]);
  
  const newPosition = lastClip ? lastClip.position + lastClip.duration : 0;
  
  const duplicatedClip = {
    ...clip,
    id: generateClipId(clip.id.split('_')[0] || 'clip'),
    position: newPosition,
  } as T;

  updateFunction([...currentClips, duplicatedClip]);
}

/**
 * 공통 클립 분할 로직
 */
export function splitClip<T extends CommonClip>(
  clipId: string,
  currentTime: number,
  pixelsPerSecond: number,
  currentClips: T[],
  updateFunction: (clips: T[]) => void
): void {
  const clip = currentClips.find(c => c.id === clipId);
  if (!clip) return;

  const playheadPos = currentTime * pixelsPerSecond;
  
  // 플레이헤드가 클립 범위 내에 있는지 확인
  if (playheadPos <= clip.position || playheadPos >= clip.position + clip.duration) {
    return;
  }

  const splitPoint = playheadPos - clip.position;
  
  // 첫 번째 부분 (원본 클립 수정)
  const firstPart = {
    ...clip,
    duration: splitPoint,
  } as T;

  // 두 번째 부분 (새 클립)
  const secondPart = {
    ...clip,
    id: `${clip.id}-split-${Date.now()}`,
    position: clip.position + splitPoint,
    duration: clip.duration - splitPoint,
  } as T;

  // 사운드 클립인 경우 startTime 조정
  if (isSoundClip(clip)) {
    const soundClip = clip as SoundClip;
    const originalStartTime = soundClip.startTime || 0;
    const splitTimeInSeconds = splitPoint / pixelsPerSecond;
    
    (secondPart as SoundClip).startTime = originalStartTime + splitTimeInSeconds;
  }

  const updatedClips = currentClips.map(c => 
    c.id === clipId ? firstPart : c
  );
  
  updateFunction([...updatedClips, secondPart]);
}

/**
 * 특정 레인의 클립들만 필터링
 */
export function getClipsForLane<T extends CommonClip>(clips: T[], laneIndex: number): T[] {
  return clips.filter(clip => (clip.laneIndex ?? 0) === laneIndex);
}

/**
 * 클립 타입 검증
 */
export function isVideoClip(clip: CommonClip): clip is VideoClip {
  return 'url' in clip && 'thumbnails' in clip;
}

export function isTextClip(clip: CommonClip): clip is TextClip {
  return 'content' in clip && 'style' in clip;
}

export function isSoundClip(clip: CommonClip): clip is SoundClip {
  return 'volume' in clip && 'name' in clip;
}

// ===== 타임라인 헬퍼 함수들 =====

/**
 * 클립 ID로 클립 찾기
 */
export function findClipById<T extends BaseClip>(
  clips: T[],
  clipId: string
): T | undefined {
  return clips.find(c => c.id === clipId);
}

/**
 * 특정 위치의 클립 찾기
 */
export function getClipAtPosition<T extends BaseClip>(
  clips: T[],
  position: number
): T | null {
  const clip = clips.find(c => 
    position >= c.position &&
    position <= c.position + c.duration
  );
  return clip || null;
}

/**
 * 두 클립의 겹침 여부 확인
 */
export function checkClipsOverlap<T extends BaseClip>(
  clip1: T,
  clip2: T
): boolean {
  const clip1Start = clip1.position;
  const clip1End = clip1.position + clip1.duration;
  const clip2Start = clip2.position;
  const clip2End = clip2.position + clip2.duration;
  
  return clip1Start < clip2End && clip1End > clip2Start;
}

/**
 * 클립들을 위치순으로 정렬
 */
export function sortClipsByPosition<T extends BaseClip>(clips: T[]): T[] {
  return [...clips].sort((a, b) => a.position - b.position);
}

/**
 * 특정 범위 내의 클립들 가져오기
 */
export function getClipsInRange<T extends BaseClip>(
  clips: T[],
  startPosition: number,
  endPosition: number
): T[] {
  return clips.filter(clip => {
    const clipStart = clip.position;
    const clipEnd = clip.position + clip.duration;
    
    // 클립이 범위와 겹치는지 확인
    return clipStart < endPosition && clipEnd > startPosition;
  });
}

/**
 * 클립 위치 업데이트
 */
export function updateClipPosition<T extends BaseClip>(
  clips: T[],
  clipId: string,
  newPosition: number
): T[] {
  return clips.map(clip => 
    clip.id === clipId 
      ? { ...clip, position: Math.max(0, newPosition) }
      : clip
  );
}

/**
 * 클립 길이 업데이트
 */
export function updateClipDuration<T extends BaseClip>(
  clips: T[],
  clipId: string,
  newDuration: number
): T[] {
  return clips.map(clip => 
    clip.id === clipId 
      ? { ...clip, duration: Math.max(80, newDuration) } // 최소 80px 너비
      : clip
  );
}

/**
 * 타입별 클립 가져오기
 */
export function getClipsByType(
  type: ClipType,
  videoClips: VideoClip[],
  textClips: TextClip[],
  soundClips: SoundClip[]
): CommonClip[] {
  switch (type) {
    case 'video':
      return videoClips;
    case 'text':
      return textClips;
    case 'sound':
      return soundClips;
    default:
      return [];
  }
}

/**
 * 모든 트랙의 타임라인 길이 계산
 */
export function calculateTimelineDuration(
  videoClips: VideoClip[],
  textClips: TextClip[],
  soundClips: SoundClip[],
  pixelsPerSecond: number
): number {
  const getTrackEnd = (clips: BaseClip[]) => {
    if (clips.length === 0) return 0;
    return Math.max(...clips.map(c => c.position + c.duration));
  };
  
  const videoEnd = getTrackEnd(videoClips) / pixelsPerSecond;
  const textEnd = getTrackEnd(textClips) / pixelsPerSecond;
  const soundEnd = getTrackEnd(soundClips) / pixelsPerSecond;
  
  return Math.max(videoEnd, textEnd, soundEnd, 0);
}

/**
 * 시간 포맷팅 (초 → MM:SS)
 */
export function formatTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

/**
 * 타임라인 시간 마커 생성
 */
export function generateTimeMarkers(duration: number, interval: number = 1): string[] {
  const markers: string[] = [];
  for (let i = 0; i <= Math.ceil(duration); i += interval) {
    markers.push(formatTime(i));
  }
  return markers;
}

/**
 * 클립 가장자리 근처 여부 확인 (스냅용)
 */
export function isNearClipEdge<T extends BaseClip>(
  position: number,
  clips: T[],
  threshold: number = 10
): { snap: boolean; snapPosition: number } {
  for (const clip of clips) {
    const clipStart = clip.position;
    const clipEnd = clip.position + clip.duration;
    
    if (Math.abs(position - clipStart) <= threshold) {
      return { snap: true, snapPosition: clipStart };
    }
    
    if (Math.abs(position - clipEnd) <= threshold) {
      return { snap: true, snapPosition: clipEnd };
    }
  }
  
  return { snap: false, snapPosition: position };
}

/**
 * 클립 ID 생성
 */
export function generateClipId(prefix: string = 'clip'): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * 선택 영역과 클립의 교차 여부 확인
 */
export function isClipInSelectionRect<T extends BaseClip>(
  clip: T,
  rectLeft: number,
  rectRight: number,
  trackTop: number,
  trackBottom: number,
  clipTop: number,
  clipHeight: number
): boolean {
  const clipLeft = clip.position;
  const clipRight = clip.position + clip.duration;
  const clipBottom = clipTop + clipHeight;
  
  return (
    clipLeft < rectRight &&
    clipRight > rectLeft &&
    clipTop < trackBottom &&
    clipBottom > trackTop
  );
}

/**
 * ID 목록으로 클립들 일괄 삭제
 */
export function deleteClipsByIds<T extends BaseClip>(
  clips: T[],
  idsToDelete: string[]
): T[] {
  return clips.filter(clip => !idsToDelete.includes(clip.id));
}

/**
 * 모든 트랙의 클립 경계점 수집
 */
export function getAllClipBoundaries(
  videoClips: VideoClip[],
  textClips: TextClip[],
  soundClips: SoundClip[],
  pixelsPerSecond: number
): number[] {
  const boundaries: number[] = [];
  
  // 모든 클립의 시작점과 끝점 수집
  [...videoClips, ...textClips, ...soundClips].forEach(clip => {
    boundaries.push(clip.position / pixelsPerSecond);
    boundaries.push((clip.position + clip.duration) / pixelsPerSecond);
  });
  
  // 중복 제거 및 정렬
  return [...new Set(boundaries)].sort((a, b) => a - b);
}

/**
 * 이전 클립 경계점 찾기
 */
export function findPreviousBoundary(
  currentTime: number,
  boundaries: number[]
): number | null {
  // 현재 위치보다 작은 경계점 중 가장 큰 값 찾기
  const tolerance = 0.001;
  const previousBoundaries = boundaries.filter(boundary => boundary < currentTime - tolerance);
  
  if (previousBoundaries.length === 0) {
    return null;
  }
  
  return Math.max(...previousBoundaries);
}

/**
 * 다음 클립 경계점 찾기
 */
export function findNextBoundary(
  currentTime: number,
  boundaries: number[]
): number | null {
  // 현재 위치보다 큰 경계점 중 가장 작은 값 찾기
  const tolerance = 0.001;
  const nextBoundaries = boundaries.filter(boundary => boundary > currentTime + tolerance);
  
  if (nextBoundaries.length === 0) {
    return null;
  }
  
  return Math.min(...nextBoundaries);
}

// ===== timeline-utils.ts에서 이동한 함수들 =====

/**
 * 그리드에 위치 스냅
 */
export const snapToGrid = (position: number, gridSize: number): number => {
  return Math.round(position / gridSize) * gridSize;
};

/**
 * 사용 가능한 위치 찾기
 */
export const findAvailablePosition = <T extends BaseClip>(
  clips: T[],
  duration: number,
  preferredPosition: number = 0
): number | null => {
  // 클립들을 위치순으로 정렬
  const sortedClips = [...clips].sort((a, b) => a.position - b.position);
  
  // 선호 위치에서 겹침 확인
  const hasOverlap = checkClipOverlap(clips, '', preferredPosition, duration);
  if (!hasOverlap) {
    return Math.max(0, preferredPosition);
  }
  
  // 첫 번째 사용 가능한 공간 찾기
  let currentPosition = 0;
  
  for (const clip of sortedClips) {
    if (currentPosition + duration <= clip.position) {
      return currentPosition;
    }
    currentPosition = clip.position + clip.duration; // 클립 간 간격 없이 배치
  }
  
  return currentPosition;
};

/**
 * 다음 위치 계산 (플레이헤드 기준)
 */
export const getNextPosition = <T extends BaseClip>(
  clips: T[],
  currentTime: number,
  pixelsPerSecond: number
): number => {
  if (clips.length === 0) return 0;
  
  if (currentTime > 0) {
    // 플레이헤드가 시작점이 아닐 때는 플레이헤드 위치 사용
    return currentTime * pixelsPerSecond;
  } else {
    // 플레이헤드가 0일 때는 마지막 클립 뒤에 배치
    return clips.reduce((max, clip) => {
      const clipEnd = clip.position + clip.duration;
      return Math.max(max, clipEnd);
    }, 0);
  }
};

/**
 * 겹침 없는 위치 찾기 (방향 기반)
 */
export const findNonOverlappingPositionWithDirection = <T extends BaseClip>(
  clips: T[],
  requestedPosition: number,
  duration: number
): number => {
  
  // 겹침을 허용할 최소 threshold (픽셀)
  const OVERLAP_THRESHOLD = 20; // 20픽셀 이상 겹쳐야 자동 재배치
  
  // 겹치는 클립들 찾기
  const overlappingClips = clips.filter(clip => {
    const clipStart = clip.position;
    const clipEnd = clip.position + clip.duration;
    const draggedStart = requestedPosition;
    const draggedEnd = requestedPosition + duration;
    
    // 겹침 체크
    if (draggedStart < clipEnd && draggedEnd > clipStart) {
      // 겹침 정도 계산
      const overlapStart = Math.max(draggedStart, clipStart);
      const overlapEnd = Math.min(draggedEnd, clipEnd);
      const overlapAmount = overlapEnd - overlapStart;
      
      // threshold 이상 겹칠 때만 재배치 대상
      return overlapAmount > OVERLAP_THRESHOLD;
    }
    return false;
  });
  
  if (overlappingClips.length === 0) {
    // 심각한 겹침 없음, 요청 위치에 배치
    return Math.max(0, requestedPosition);
  }
  
  // 드래그된 클립의 중심점
  const draggedCenter = requestedPosition + (duration / 2);
  
  // 겹치는 클립들 중 가장 가까운 클립 찾기
  const closestClip = overlappingClips.reduce((closest, clip) => {
    const clipCenter = clip.position + (clip.duration / 2);
    const closestCenter = closest.position + (closest.duration / 2);
    
    const distToCurrent = Math.abs(draggedCenter - clipCenter);
    const distToClosest = Math.abs(draggedCenter - closestCenter);
    
    return distToCurrent < distToClosest ? clip : closest;
  });
  
  // 가장 가까운 클립의 중심과 비교하여 배치 위치 결정
  const targetClipCenter = closestClip.position + (closestClip.duration / 2);
  
  if (draggedCenter > targetClipCenter) {
    // 드래그한 클립의 중심이 타겟 클립보다 오른쪽 → 오른쪽에 배치
    const finalPos = closestClip.position + closestClip.duration;
    return finalPos;
  } else {
    // 드래그한 클립의 중심이 타겟 클립보다 왼쪽 → 왼쪽에 배치
    const leftPosition = closestClip.position - duration;
    
    // 음수 위치가 되면 오른쪽에 배치
    if (leftPosition < 0) {
      const finalPos = closestClip.position + closestClip.duration;
      return finalPos;
    }
    return leftPosition;
  }
};

/**
 * 자유 배치 (텍스트/사운드용 - 다른 클립을 밀지 않음)
 */
export const freePositioning = <T extends BaseClip>(
  clips: T[],
  draggedClipId: string,
  requestedPosition: number,
  duration: number
): number => {
  // 드래그된 클립 제외한 클립들
  const otherClips = clips.filter(c => c.id !== draggedClipId);
  
  // 요청된 위치에서 겹침 확인
  const hasOverlap = otherClips.some(clip => {
    const clipStart = clip.position;
    const clipEnd = clip.position + clip.duration;
    const draggedStart = requestedPosition;
    const draggedEnd = requestedPosition + duration;
    
    return draggedStart < clipEnd && draggedEnd > clipStart;
  });
  
  // 겹침이 없으면 요청된 위치 사용
  if (!hasOverlap) {
    return Math.max(0, requestedPosition);
  }
  
  // 겹침이 있으면 가장 가까운 빈 공간 찾기
  const sortedClips = [...otherClips].sort((a, b) => a.position - b.position);
  
  // 요청 위치 앞쪽의 빈 공간 찾기
  let bestPosition = requestedPosition;
  let minDistance = Infinity;
  
  // 맨 앞 확인
  if (sortedClips.length === 0 || sortedClips[0].position >= duration) {
    const frontPosition = 0;
    const distance = Math.abs(requestedPosition - frontPosition);
    if (distance < minDistance) {
      bestPosition = frontPosition;
      minDistance = distance;
    }
  }
  
  // 클립들 사이 공간 확인
  for (let i = 0; i < sortedClips.length - 1; i++) {
    const leftEnd = sortedClips[i].position + sortedClips[i].duration;
    const rightStart = sortedClips[i + 1].position;
    const gap = rightStart - leftEnd;
    
    if (gap >= duration) {
      // 이 공간에 들어갈 수 있음
      const candidatePosition = leftEnd;
      const distance = Math.abs(requestedPosition - candidatePosition);
      if (distance < minDistance) {
        bestPosition = candidatePosition;
        minDistance = distance;
      }
    }
  }
  
  // 마지막 클립 뒤 확인
  if (sortedClips.length > 0) {
    const lastClip = sortedClips[sortedClips.length - 1];
    const afterLastPosition = lastClip.position + lastClip.duration;
    const distance = Math.abs(requestedPosition - afterLastPosition);
    if (distance < minDistance) {
      bestPosition = afterLastPosition;
      minDistance = distance;
    }
  }
  
  return Math.max(0, bestPosition);
};

/**
 * 사운드 배치 (사운드 클립용 - 클립 간 삽입 감지)
 */
export const soundPositioning = <T extends BaseClip>(
  clips: T[],
  draggedClipId: string,
  requestedPosition: number,
  duration: number
): { targetPosition: number; adjustedClips: T[] } => {
  // 드래그된 클립 제외한 클립들을 position 순으로 정렬
  const otherClips = clips.filter(c => c.id !== draggedClipId);
  const sortedClips = [...otherClips].sort((a, b) => a.position - b.position);
  
  // 클립이 없으면 그냥 요청 위치에 배치
  if (sortedClips.length === 0) {
    return { targetPosition: Math.max(0, requestedPosition), adjustedClips: [] };
  }
  
  // 드래그된 클립의 중심과 끝점
  const draggedCenter = requestedPosition + (duration / 2);
  const draggedEnd = requestedPosition + duration;
  
  // 1. 두 클립 사이에 있는지 확인
  for (let i = 0; i < sortedClips.length - 1; i++) {
    const leftClip = sortedClips[i];
    const rightClip = sortedClips[i + 1];
    
    const leftEnd = leftClip.position + leftClip.duration;
    const rightStart = rightClip.position;
    
    // 드래그한 클립이 두 클립 사이 공간과 관련이 있는지 확인
    const isInBetween = 
      (draggedCenter >= leftEnd && draggedCenter <= rightStart) || // 중심이 사이에
      (requestedPosition >= leftEnd && requestedPosition <= rightStart) || // 시작이 사이에
      (draggedEnd >= leftEnd && draggedEnd <= rightStart) || // 끝이 사이에
      (requestedPosition <= leftEnd && draggedEnd >= rightStart); // 공간을 완전히 덮음
    
    if (isInBetween) {
      const gap = rightStart - leftEnd;
      
      if (gap >= duration) {
        // 공간이 충분하면 사용자가 드래그한 위치에 배치
        let finalPosition = requestedPosition;
        
        // 왼쪽 클립과 겹치는 경우 조정
        if (finalPosition < leftEnd) {
          finalPosition = leftEnd;
        }
        
        // 오른쪽 클립과 겹치는 경우 조정
        if (finalPosition + duration > rightStart) {
          finalPosition = rightStart - duration;
        }
        
        return {
          targetPosition: finalPosition,
          adjustedClips: otherClips
        };
      } else {
        // 공간이 부족하면 오른쪽 클립들을 밀어내되, 연속적으로 재배치
        const insertPosition = leftEnd; // 삽입 위치는 왼쪽 클립 끝
        
        // 오른쪽 클립들을 연속적으로 재배치
        let currentPosition = insertPosition + duration; // 삽입될 클립 다음 위치
        const adjustedClips = sortedClips.map((clip, idx) => {
          if (idx <= i) {
            // 왼쪽 클립들은 그대로
            return clip;
          } else {
            // 오른쪽 클립들을 연속적으로 배치 (빈 공간 없이)
            const newClip = { ...clip, position: currentPosition } as T;
            currentPosition = currentPosition + clip.duration; // 다음 클립 위치 업데이트
            return newClip;
          }
        });
        
        return {
          targetPosition: insertPosition,
          adjustedClips
        };
      }
    }
  }
  
  // 2. 맨 앞에 놓으려는 경우
  if (draggedEnd <= sortedClips[0].position) {
    return {
      targetPosition: Math.max(0, requestedPosition),
      adjustedClips: otherClips
    };
  }
  
  // 3. 맨 앞 클립과 겹치는 경우 - 모든 클립 밀기
  if (requestedPosition < sortedClips[0].position && draggedEnd > sortedClips[0].position) {
    const pushAmount = draggedEnd - sortedClips[0].position;
    
    const adjustedClips = sortedClips.map(clip => ({
      ...clip,
      position: clip.position + pushAmount
    } as T));
    
    return {
      targetPosition: Math.max(0, requestedPosition),
      adjustedClips
    };
  }
  
  // 4. 단일 클립 위에 있는 경우 - 중심 기준 좌/우 배치
  const overlappingClip = sortedClips.find(clip =>
    requestedPosition < clip.position + clip.duration &&
    draggedEnd > clip.position
  );
  
  if (overlappingClip) {
    const clipCenter = overlappingClip.position + (overlappingClip.duration / 2);
    
    if (draggedCenter > clipCenter) {
      // 오른쪽에 배치
      return {
        targetPosition: overlappingClip.position + overlappingClip.duration,
        adjustedClips: otherClips
      };
    } else {
      // 왼쪽에 배치
      const leftPos = overlappingClip.position - duration;
      
      if (leftPos < 0) {
        // 맨 앞 공간 부족 - 모든 클립 밀어내기
        const pushAmount = -leftPos;
        
        const adjustedClips = sortedClips.map(clip => ({
          ...clip,
          position: clip.position + pushAmount
        } as T));
        
        return {
          targetPosition: 0,
          adjustedClips
        };
      }
      
      return {
        targetPosition: leftPos,
        adjustedClips: otherClips
      };
    }
  }
  
  // 5. 빈 공간에 배치
  return {
    targetPosition: Math.max(0, requestedPosition),
    adjustedClips: otherClips
  };
};

/**
 * 자석 삽입 - 클립 삽입 시 오른쪽 클립들 밀어내기
 */
export const magneticInsert = <T extends BaseClip>(
  clips: T[],
  insertPosition: number,
  insertDuration: number
): T[] => {
  return clips.map(clip => {
    // 삽입 위치 이후의 클립들 밀어내기
    if (clip.position >= insertPosition) {
      return {
        ...clip,
        position: clip.position + insertDuration
      };
    }
    // 삽입 위치와 겹치는 클립들 밀어내기
    if (clip.position < insertPosition && clip.position + clip.duration > insertPosition) {
      return {
        ...clip,
        position: insertPosition + insertDuration
      };
    }
    return clip;
  });
};

/**
 * 자석 삭제 - 클립 삭제 시 왼쪽으로 당기기 (ripple delete)
 */
export const magneticDelete = <T extends BaseClip>(
  clips: T[],
  deletedPosition: number,
  deletedDuration: number
): T[] => {
  return clips.map(clip => {
    // 삭제된 위치 이후의 클립들 왼쪽으로 당기기
    if (clip.position > deletedPosition) {
      return {
        ...clip,
        position: Math.max(deletedPosition, clip.position - deletedDuration)
      };
    }
    return clip;
  });
};

/**
 * 클립 간 간격 제거 (타임라인 압축)
 */
export const removeGaps = <T extends BaseClip>(clips: T[]): T[] => {
  if (clips.length === 0) return clips;
  
  // 클립들을 위치순으로 정렬
  const sortedClips = [...clips].sort((a, b) => a.position - b.position);
  
  return sortedClips.map((clip, index) => {
    if (index === 0) {
      // 첫 번째 클립은 위치 0에 배치
      return { ...clip, position: 0 };
    }
    
    const previousClip = sortedClips[index - 1];
    const expectedPosition = previousClip.position + previousClip.duration;
    
    // 간격이 있으면 제거
    if (clip.position > expectedPosition) {
      return { ...clip, position: expectedPosition };
    }
    
    return clip;
  });
};

/**
 * 길이 변경 후 위치 재계산
 * 클립들이 빈틈없이 유지되도록 보장
 */
export const recalculatePositionsAfterDurationChange = <T extends BaseClip>(
  clips: T[],
  changedClipId: string,
  newDuration: number
): T[] => {
  const clipIndex = clips.findIndex(c => c.id === changedClipId);
  if (clipIndex === -1) return clips;
  
  const oldDuration = clips[clipIndex].duration;
  const durationDiff = newDuration - oldDuration;
  
  return clips.map((clip, idx) => {
    if (clip.id === changedClipId) {
      // 변경된 클립의 길이 업데이트
      return { ...clip, duration: newDuration };
    } else if (idx > clipIndex) {
      // 변경된 클립 이후의 클립들 위치 조정
      return { ...clip, position: clip.position + durationDiff };
    }
    return clip;
  });
};