import type { SoundClip, TextClip, VideoClip } from '@/shared/types/video-editor';

/**
 * 최대 사운드 레인 수
 */
export const MAX_SOUND_LANES = 3;

/**
 * 최대 텍스트 레인 수
 */
export const MAX_TEXT_LANES = 3;

/**
 * 최대 비디오 레인 수
 */
export const MAX_VIDEO_LANES = 3;

/**
 * 특정 레인에 속한 클립들을 반환합니다
 * 
 * @param clips 모든 사운드 클립 배열
 * @param laneIndex 레인 인덱스 (0-4)
 * @returns 해당 레인의 클립들
 */
export function getClipsForLane(clips: SoundClip[], laneIndex: number): SoundClip[] {
  return clips.filter(clip => (clip.laneIndex ?? 0) === laneIndex);
}

/**
 * 레인 인덱스를 유효한 범위로 제한합니다
 * 
 * @param index 레인 인덱스
 * @returns 유효한 레인 인덱스 (0-4)
 */
export function validateLaneIndex(index: number): number {
  return Math.max(0, Math.min(MAX_SOUND_LANES - 1, index));
}

/**
 * 클립들이 사용하고 있는 레인 인덱스를 반환합니다 (범용)
 * @param clips - 분석할 클립 배열 (laneIndex 속성을 가진 모든 클립 타입)
 * @returns 사용 중인 레인 인덱스 배열 (정렬됨)
 */
export function getUsedLanesFromClips<T extends { laneIndex?: number }>(clips: T[]): number[] {
  const usedLanes = new Set<number>();
  clips.forEach(clip => {
    usedLanes.add(clip.laneIndex ?? 0);
  });
  return Array.from(usedLanes).sort((a, b) => a - b);
}

/**
 * 클립 배열에서 사용 중인 레인들을 반환합니다 (사운드 클립 전용)
 * 
 * @param clips 사운드 클립 배열
 * @returns 사용 중인 레인 인덱스 배열 (정렬됨)
 */
export function getUsedLanes(clips: SoundClip[]): number[] {
  return getUsedLanesFromClips(clips);
}

/**
 * 현재 활성화된 레인 수를 계산합니다
 * 
 * @param clips 사운드 클립 배열
 * @returns 활성 레인 수 (최소 1, 최대 MAX_SOUND_LANES)
 */
export function getActiveLaneCount(clips: SoundClip[]): number {
  const usedLanes = getUsedLanes(clips);
  return Math.max(1, usedLanes.length);
}

/**
 * 새로운 레인을 추가할 수 있는지 확인합니다
 * 
 * @param currentLanes 현재 레인 배열
 * @returns 추가 가능 여부
 */
export function canAddNewLane(currentLanes: number[]): boolean {
  return currentLanes.length < MAX_SOUND_LANES;
}

/**
 * 다음 사용 가능한 레인 인덱스를 반환합니다
 * 
 * @param currentLanes 현재 레인 배열
 * @returns 다음 사용 가능한 레인 인덱스 (없으면 null)
 */
export function getNextAvailableLane(currentLanes: number[]): number | null {
  for (let i = 0; i < MAX_SOUND_LANES; i++) {
    if (!currentLanes.includes(i)) {
      return i;
    }
  }
  return null;
}

/**
 * 클립이 특정 레인에서 다른 클립과 겹치는지 확인합니다
 * 
 * @param clip 확인할 클립
 * @param targetLane 목표 레인
 * @param allClips 모든 사운드 클립
 * @returns 겹침 여부
 */
export function hasOverlapInLane(
  clip: SoundClip, 
  targetLane: number, 
  allClips: SoundClip[]
): boolean {
  const laneClips = getClipsForLane(allClips, targetLane);
  
  return laneClips.some(otherClip => {
    if (otherClip.id === clip.id) return false;
    
    const clipStart = clip.position;
    const clipEnd = clip.position + clip.duration;
    const otherStart = otherClip.position;
    const otherEnd = otherClip.position + otherClip.duration;
    
    return clipStart < otherEnd && clipEnd > otherStart;
  });
}

/**
 * 레인별 클립 수를 계산합니다
 * 
 * @param clips 사운드 클립 배열
 * @returns 레인별 클립 수 객체
 */
export function getLaneClipCounts(clips: SoundClip[]): Record<number, number> {
  const counts: Record<number, number> = {};
  
  clips.forEach(clip => {
    const lane = clip.laneIndex ?? 0;
    counts[lane] = (counts[lane] || 0) + 1;
  });
  
  return counts;
}

/**
 * 빈 레인인지 확인합니다
 * 
 * @param laneIndex 레인 인덱스
 * @param clips 사운드 클립 배열
 * @returns 빈 레인 여부
 */
export function isEmptyLane(laneIndex: number, clips: SoundClip[]): boolean {
  return getClipsForLane(clips, laneIndex).length === 0;
}

/**
 * 레인을 삭제할 수 있는지 확인합니다 (빈 레인이고 마지막 레인이 아닌 경우)
 * 
 * @param laneIndex 레인 인덱스
 * @param clips 사운드 클립 배열
 * @param currentLanes 현재 레인 배열
 * @returns 삭제 가능 여부
 */
export function canRemoveLane(
  laneIndex: number, 
  clips: SoundClip[], 
  currentLanes: number[]
): boolean {
  // 첫 번째 레인(0)은 삭제 불가
  if (laneIndex === 0) return false;
  
  // 클립이 있는 레인은 삭제 불가
  if (!isEmptyLane(laneIndex, clips)) return false;
  
  // 최소 1개 레인은 유지
  if (currentLanes.length <= 1) return false;
  
  return true;
}

// ===============================
// TEXT LANE MANAGEMENT FUNCTIONS
// ===============================

/**
 * 특정 레인에 속한 텍스트 클립들을 반환합니다
 * 
 * @param clips 모든 텍스트 클립 배열
 * @param laneIndex 레인 인덱스 (0-2)
 * @returns 해당 레인의 텍스트 클립들
 */
export function getTextClipsForLane(clips: TextClip[], laneIndex: number): TextClip[] {
  return clips.filter(clip => (clip.laneIndex ?? 0) === laneIndex);
}

/**
 * 텍스트 레인 인덱스를 유효한 범위로 제한합니다
 * 
 * @param index 레인 인덱스
 * @returns 유효한 레인 인덱스 (0-2)
 */
export function validateTextLaneIndex(index: number): number {
  return Math.max(0, Math.min(MAX_TEXT_LANES - 1, index));
}

/**
 * 텍스트 클립 배열에서 사용 중인 레인들을 반환합니다
 * 
 * @param clips 텍스트 클립 배열
 * @returns 사용 중인 레인 인덱스 배열 (정렬됨)
 */
export function getUsedTextLanes(clips: TextClip[]): number[] {
  return getUsedLanesFromClips(clips);
}

/**
 * 현재 활성화된 텍스트 레인 수를 계산합니다
 * 
 * @param clips 텍스트 클립 배열
 * @returns 활성 레인 수 (최소 1, 최대 MAX_TEXT_LANES)
 */
export function getActiveTextLaneCount(clips: TextClip[]): number {
  const usedLanes = getUsedTextLanes(clips);
  return Math.max(1, usedLanes.length);
}

/**
 * 새로운 텍스트 레인을 추가할 수 있는지 확인합니다
 * 
 * @param currentLanes 현재 레인 배열
 * @returns 추가 가능 여부
 */
export function canAddNewTextLane(currentLanes: number[]): boolean {
  return currentLanes.length < MAX_TEXT_LANES;
}

/**
 * 다음 사용 가능한 텍스트 레인 인덱스를 반환합니다
 * 
 * @param currentLanes 현재 레인 배열
 * @returns 다음 사용 가능한 레인 인덱스 (없으면 null)
 */
export function getNextAvailableTextLane(currentLanes: number[]): number | null {
  for (let i = 0; i < MAX_TEXT_LANES; i++) {
    if (!currentLanes.includes(i)) {
      return i;
    }
  }
  return null;
}

/**
 * 텍스트 클립이 특정 레인에서 다른 클립과 겹치는지 확인합니다
 * 
 * @param clip 확인할 클립
 * @param targetLane 목표 레인
 * @param allClips 모든 텍스트 클립
 * @returns 겹침 여부
 */
export function hasTextOverlapInLane(
  clip: TextClip, 
  targetLane: number, 
  allClips: TextClip[]
): boolean {
  const laneClips = getTextClipsForLane(allClips, targetLane);
  
  return laneClips.some(otherClip => {
    if (otherClip.id === clip.id) return false;
    
    const clipStart = clip.position;
    const clipEnd = clip.position + clip.duration;
    const otherStart = otherClip.position;
    const otherEnd = otherClip.position + otherClip.duration;
    
    return clipStart < otherEnd && clipEnd > otherStart;
  });
}

/**
 * 텍스트 레인별 클립 수를 계산합니다
 * 
 * @param clips 텍스트 클립 배열
 * @returns 레인별 클립 수 객체
 */
export function getTextLaneClipCounts(clips: TextClip[]): Record<number, number> {
  const counts: Record<number, number> = {};
  
  clips.forEach(clip => {
    const lane = clip.laneIndex ?? 0;
    counts[lane] = (counts[lane] || 0) + 1;
  });
  
  return counts;
}

/**
 * 텍스트 레인이 빈 레인인지 확인합니다
 * 
 * @param laneIndex 레인 인덱스
 * @param clips 텍스트 클립 배열
 * @returns 빈 레인 여부
 */
export function isEmptyTextLane(laneIndex: number, clips: TextClip[]): boolean {
  return getTextClipsForLane(clips, laneIndex).length === 0;
}

/**
 * 텍스트 레인을 삭제할 수 있는지 확인합니다 (빈 레인이고 마지막 레인이 아닌 경우)
 * 
 * @param laneIndex 레인 인덱스
 * @param clips 텍스트 클립 배열
 * @param currentLanes 현재 레인 배열
 * @returns 삭제 가능 여부
 */
export function canRemoveTextLane(
  laneIndex: number, 
  clips: TextClip[], 
  currentLanes: number[]
): boolean {
  // 첫 번째 레인(0)은 삭제 불가
  if (laneIndex === 0) return false;
  
  // 클립이 있는 레인은 삭제 불가
  if (!isEmptyTextLane(laneIndex, clips)) return false;
  
  // 최소 1개 레인은 유지
  if (currentLanes.length <= 1) return false;
  
  return true;
}

// ===============================
// VIDEO LANE MANAGEMENT FUNCTIONS  
// ===============================

/**
 * 특정 레인에 속한 비디오 클립들을 반환합니다
 * 
 * @param clips 모든 비디오 클립 배열
 * @param laneIndex 레인 인덱스 (0-2)
 * @returns 해당 레인의 비디오 클립들
 */
export function getVideoClipsForLane(clips: VideoClip[], laneIndex: number): VideoClip[] {
  return clips.filter(clip => (clip.laneIndex ?? 0) === laneIndex);
}

/**
 * 비디오 레인 인덱스를 유효한 범위로 제한합니다
 * 
 * @param index 레인 인덱스
 * @returns 유효한 레인 인덱스 (0-2)
 */
export function validateVideoLaneIndex(index: number): number {
  return Math.max(0, Math.min(MAX_VIDEO_LANES - 1, index));
}

/**
 * 비디오 클립 배열에서 사용 중인 레인들을 반환합니다
 * 
 * @param clips 비디오 클립 배열
 * @returns 사용 중인 레인 인덱스 배열 (정렬됨)
 */
export function getUsedVideoLanes(clips: VideoClip[]): number[] {
  return getUsedLanesFromClips(clips);
}

/**
 * 현재 활성화된 비디오 레인 수를 계산합니다
 * 
 * @param clips 비디오 클립 배열
 * @returns 활성 레인 수 (최소 1, 최대 MAX_VIDEO_LANES)
 */
export function getActiveVideoLaneCount(clips: VideoClip[]): number {
  const usedLanes = getUsedVideoLanes(clips);
  return Math.max(1, usedLanes.length);
}

/**
 * 새로운 비디오 레인을 추가할 수 있는지 확인합니다
 * 
 * @param currentLanes 현재 레인 배열
 * @returns 추가 가능 여부
 */
export function canAddNewVideoLane(currentLanes: number[]): boolean {
  return currentLanes.length < MAX_VIDEO_LANES;
}

/**
 * 다음 사용 가능한 비디오 레인 인덱스를 반환합니다
 * 
 * @param currentLanes 현재 레인 배열
 * @returns 다음 사용 가능한 레인 인덱스 (없으면 null)
 */
export function getNextAvailableVideoLane(currentLanes: number[]): number | null {
  for (let i = 0; i < MAX_VIDEO_LANES; i++) {
    if (!currentLanes.includes(i)) {
      return i;
    }
  }
  return null;
}

/**
 * 비디오 클립이 특정 레인에서 다른 클립과 겹치는지 확인합니다
 * 
 * @param clip 확인할 클립
 * @param targetLane 목표 레인
 * @param allClips 모든 비디오 클립
 * @returns 겹침 여부
 */
export function hasVideoOverlapInLane(
  clip: VideoClip, 
  targetLane: number, 
  allClips: VideoClip[]
): boolean {
  const laneClips = getVideoClipsForLane(allClips, targetLane);
  
  return laneClips.some(otherClip => {
    if (otherClip.id === clip.id) return false;
    
    const clipStart = clip.position;
    const clipEnd = clip.position + clip.duration;
    const otherStart = otherClip.position;
    const otherEnd = otherClip.position + otherClip.duration;
    
    return clipStart < otherEnd && clipEnd > otherStart;
  });
}

/**
 * 비디오 레인별 클립 수를 계산합니다
 * 
 * @param clips 비디오 클립 배열
 * @returns 레인별 클립 수 객체
 */
export function getVideoLaneClipCounts(clips: VideoClip[]): Record<number, number> {
  const counts: Record<number, number> = {};
  
  clips.forEach(clip => {
    const lane = clip.laneIndex ?? 0;
    counts[lane] = (counts[lane] || 0) + 1;
  });
  
  return counts;
}

/**
 * 비디오 레인이 빈 레인인지 확인합니다
 * 
 * @param laneIndex 레인 인덱스
 * @param clips 비디오 클립 배열
 * @returns 빈 레인 여부
 */
export function isEmptyVideoLane(laneIndex: number, clips: VideoClip[]): boolean {
  return getVideoClipsForLane(clips, laneIndex).length === 0;
}

/**
 * 비디오 레인을 삭제할 수 있는지 확인합니다 (빈 레인이고 마지막 레인이 아닌 경우)
 * 
 * @param laneIndex 레인 인덱스
 * @param clips 비디오 클립 배열
 * @param currentLanes 현재 레인 배열
 * @returns 삭제 가능 여부
 */
export function canRemoveVideoLane(
  laneIndex: number, 
  clips: VideoClip[], 
  currentLanes: number[]
): boolean {
  // 첫 번째 레인(0)은 삭제 불가
  if (laneIndex === 0) return false;
  
  // 클립이 있는 레인은 삭제 불가
  if (!isEmptyVideoLane(laneIndex, clips)) return false;
  
  // 최소 1개 레인은 유지
  if (currentLanes.length <= 1) return false;
  
  return true;
}