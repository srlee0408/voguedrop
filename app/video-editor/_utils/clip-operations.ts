import { VideoClip, TextClip, SoundClip } from '@/types/video-editor';

// 클립 복제 함수
export function duplicateVideoClip(clip: VideoClip, allClips: VideoClip[]): VideoClip {
  const newClip: VideoClip = {
    ...clip,
    id: `clip-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    position: clip.position + clip.duration, // 원본 클립 바로 뒤에 배치
  };
  
  // 겹치는 클립이 있는지 확인하고 위치 조정
  const endPosition = newClip.position + newClip.duration;
  const overlappingClips = allClips.filter(c => 
    c.id !== clip.id && 
    c.position < endPosition && 
    c.position + c.duration > newClip.position
  );
  
  if (overlappingClips.length > 0) {
    // 겹치는 클립들의 끝 위치 중 가장 뒤쪽으로 이동
    const maxEndPosition = Math.max(...overlappingClips.map(c => c.position + c.duration));
    newClip.position = maxEndPosition;
  }
  
  return newClip;
}

export function duplicateTextClip(clip: TextClip, allClips: TextClip[]): TextClip {
  const newClip: TextClip = {
    ...clip,
    id: `text-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    position: clip.position + clip.duration,
  };
  
  // 겹치는 클립이 있는지 확인하고 위치 조정
  const endPosition = newClip.position + newClip.duration;
  const overlappingClips = allClips.filter(c => 
    c.id !== clip.id && 
    c.position < endPosition && 
    c.position + c.duration > newClip.position
  );
  
  if (overlappingClips.length > 0) {
    const maxEndPosition = Math.max(...overlappingClips.map(c => c.position + c.duration));
    newClip.position = maxEndPosition;
  }
  
  return newClip;
}

export function duplicateSoundClip(clip: SoundClip, allClips: SoundClip[]): SoundClip {
  const newClip: SoundClip = {
    ...clip,
    id: `sound-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    position: clip.position + clip.duration,
  };
  
  // 겹치는 클립이 있는지 확인하고 위치 조정
  const endPosition = newClip.position + newClip.duration;
  const overlappingClips = allClips.filter(c => 
    c.id !== clip.id && 
    c.position < endPosition && 
    c.position + c.duration > newClip.position
  );
  
  if (overlappingClips.length > 0) {
    const maxEndPosition = Math.max(...overlappingClips.map(c => c.position + c.duration));
    newClip.position = maxEndPosition;
  }
  
  return newClip;
}

// 클립 분할 함수
export function splitVideoClip(
  clip: VideoClip, 
  splitPosition: number, // 픽셀 단위의 절대 위치
  pixelsPerSecond: number = 40
): { firstClip: VideoClip; secondClip: VideoClip } | null {
  // 분할 위치가 클립 범위 내에 있는지 확인
  const clipStart = clip.position;
  const clipEnd = clip.position + clip.duration;
  
  if (splitPosition <= clipStart || splitPosition >= clipEnd) {
    return null; // 분할 불가능
  }
  
  // 분할 지점 계산 (픽셀 단위)
  const splitPoint = splitPosition - clipStart;
  
  // 시간 계산 (초 단위)
  const originalStartTime = clip.startTime || 0;
  const originalEndTime = clip.endTime || (clip.maxDuration ? clip.maxDuration / pixelsPerSecond : clip.duration / pixelsPerSecond);
  const totalDurationInSeconds = originalEndTime - originalStartTime;
  
  // 분할 비율 계산
  const splitRatio = splitPoint / clip.duration;
  const splitTimeInSeconds = originalStartTime + (totalDurationInSeconds * splitRatio);
  
  // 첫 번째 클립
  const firstClip: VideoClip = {
    ...clip,
    duration: splitPoint,
    startTime: originalStartTime,
    endTime: splitTimeInSeconds,
  };
  
  // 두 번째 클립
  const secondClip: VideoClip = {
    ...clip,
    id: `clip-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    duration: clip.duration - splitPoint,
    position: splitPosition,
    startTime: splitTimeInSeconds,
    endTime: originalEndTime,
  };
  
  return { firstClip, secondClip };
}

export function splitTextClip(
  clip: TextClip,
  splitPosition: number
): { firstClip: TextClip; secondClip: TextClip } | null {
  const clipStart = clip.position;
  const clipEnd = clip.position + clip.duration;
  
  if (splitPosition <= clipStart || splitPosition >= clipEnd) {
    return null;
  }
  
  const splitPoint = splitPosition - clipStart;
  
  const firstClip: TextClip = {
    ...clip,
    duration: splitPoint,
  };
  
  const secondClip: TextClip = {
    ...clip,
    id: `text-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    duration: clip.duration - splitPoint,
    position: splitPosition,
  };
  
  return { firstClip, secondClip };
}

export function splitSoundClip(
  clip: SoundClip,
  splitPosition: number,
  pixelsPerSecond: number = 40
): { firstClip: SoundClip; secondClip: SoundClip } | null {
  const clipStart = clip.position;
  const clipEnd = clip.position + clip.duration;
  
  if (splitPosition <= clipStart || splitPosition >= clipEnd) {
    return null;
  }
  
  const splitPoint = splitPosition - clipStart;
  
  // Calculate time positions (similar to splitVideoClip)
  const originalStartTime = clip.startTime || 0;
  const originalEndTime = clip.endTime || (clip.maxDuration ? clip.maxDuration / pixelsPerSecond : clip.duration / pixelsPerSecond);
  const totalDurationInSeconds = originalEndTime - originalStartTime;
  
  // Calculate the split time within the original audio
  const splitRatio = splitPoint / clip.duration;
  const splitTimeInSeconds = originalStartTime + (totalDurationInSeconds * splitRatio);
  
  const firstClip: SoundClip = {
    ...clip,
    duration: splitPoint,
    startTime: originalStartTime,
    endTime: splitTimeInSeconds,
  };
  
  const secondClip: SoundClip = {
    ...clip,
    id: `sound-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    duration: clip.duration - splitPoint,
    position: splitPosition,
    startTime: splitTimeInSeconds,
    endTime: originalEndTime,
  };
  
  return { firstClip, secondClip };
}

/**
 * 리사이즈 시 트리밍 시작/끝 시간을 일관된 규칙으로 갱신합니다.
 * - 왼쪽 핸들: startTime만 이동, endTime은 정의되어 있으면 유지합니다
 * - 오른쪽 핸들: endTime = startTime + (duration_px / pixelsPerSecond)
 */
export function applyResizeTrim<T extends { duration: number; startTime?: number; endTime?: number }>(
  clip: T,
  newDurationPx: number,
  handle?: 'left' | 'right',
  deltaPositionPx?: number,
  pixelsPerSecond: number = 40
): Partial<T> {
  // duration은 px 단위로 유지 (타임라인과 동일 단위)
  const updates: Partial<T> = { duration: newDurationPx } as Partial<T>;

  if (handle === 'left' && typeof deltaPositionPx === 'number') {
    const deltaSeconds = deltaPositionPx / pixelsPerSecond;
    const currentStart = clip.startTime ?? 0;
    const newStart = Math.max(0, currentStart + deltaSeconds);
    (updates as any).startTime = newStart;

    // endTime이 정의되어 있다면 끝 지점은 고정해 유지
    if (clip.endTime !== undefined) {
      (updates as any).endTime = clip.endTime;
    }
  } else if (handle === 'right') {
    const currentStart = clip.startTime ?? 0;
    const durationSeconds = newDurationPx / pixelsPerSecond;
    (updates as any).endTime = currentStart + durationSeconds;
  }

  return updates;
}

// 플레이헤드 위치에서 클립 찾기
export function findClipAtPosition<T extends { position: number; duration: number }>(
  clips: T[],
  position: number
): T | null {
  return clips.find(clip => 
    position >= clip.position && 
    position < clip.position + clip.duration
  ) || null;
}