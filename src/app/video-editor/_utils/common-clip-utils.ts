import { VideoClip, TextClip, SoundClip } from '@/shared/types/video-editor';
import { soundPositioning } from './timeline-utils';

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

/**
 * 공통 클립 드래그 처리 로직
 */
export function handleClipDrag<T extends CommonClip>(
  activeClipId: string,
  clipType: ClipType,
  currentClips: T[],
  delta: number,
  dragTargetLane: DragTargetLane | null,
  updateFunction: (clips: T[]) => void
): void {
  const currentClip = currentClips.find(c => c.id === activeClipId);
  if (!currentClip) return;

  const newPosition = Math.max(0, currentClip.position + delta);
  
  // 레인 변경 감지
  const originalLane = currentClip.laneIndex ?? 0;
  const targetLaneInfo = dragTargetLane && dragTargetLane.laneType === clipType ? dragTargetLane : null;
  const targetLane = targetLaneInfo ? targetLaneInfo.laneIndex : originalLane;
  
  const updatedClip = { ...currentClip, position: newPosition } as T;
  
  // 레인이 변경된 경우 완전히 자유로운 위치 지정
  if (targetLane !== originalLane) {
    updatedClip.laneIndex = targetLane;
    
    // 레인 변경 시에는 겹침을 허용하여 자유롭게 배치
    const updatedClips = currentClips.map(clip =>
      clip.id === activeClipId ? updatedClip : clip
    ).sort((a, b) => a.position - b.position);
    
    updateFunction(updatedClips);
  } else {
    // 같은 레인 내에서는 사운드 클립과 동일하게 soundPositioning 사용
    const sameLaneClips = currentClips.filter(c => (c.laneIndex ?? 0) === originalLane);
    
    const { targetPosition, adjustedClips } = soundPositioning(
      sameLaneClips,
      activeClipId,
      newPosition,
      currentClip.duration
    );
    
    // 다른 레인 클립들과 조정된 같은 레인 클립들을 합침
    const otherLaneClips = currentClips.filter(c => (c.laneIndex ?? 0) !== originalLane);
    const updatedClips = [
      ...otherLaneClips,
      ...adjustedClips as T[],
      { ...currentClip, position: targetPosition } as T
    ].sort((a, b) => a.position - b.position);
    
    updateFunction(updatedClips);
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
    updatePositionFunction(clipId, newPosition);
  }
  
  // 리사이즈 함수 호출
  if (resizeFunction) {
    const deltaPosition = resizeHandle === 'left' ? newPosition - startPosition : 0;
    resizeFunction(clipId, newWidth, resizeHandle, deltaPosition);
  }
}

/**
 * 공통 클립 복제 로직
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
    id: `${clip.id}-copy-${Date.now()}`,
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