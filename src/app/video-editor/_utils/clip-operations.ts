/**
 * Clip Operations - 비디오 편집기 클립 조작 유틸리티
 * 
 * 주요 역할:
 * 1. 비디오, 텍스트, 사운드 클립의 복제 기능 제공
 * 2. 타임라인 끝에 새로운 클립 자동 배치
 * 3. 고유한 ID 생성으로 클립 식별 관리
 * 4. 클립 위치 계산 및 충돌 방지 로직
 * 
 * 핵심 특징:
 * - 타임라인의 가장 끝 위치를 계산하여 새 클립 배치
 * - 타임스탬프와 랜덤 문자열 조합으로 고유 ID 생성
 * - 각 클립 타입별로 특화된 복제 함수 제공
 * - 기존 클립들과의 겹침 방지 자동 처리
 * 
 * 주의사항:
 * - Date.now()와 Math.random() 조합으로 ID 생성하므로 충돌 가능성 극히 낮음
 * - 복제된 클립은 항상 타임라인 끝에 배치됨
 * - 클립 배열이 비어있는 경우 position 0에서 시작
 */
import { VideoClip, TextClip, SoundClip } from '@/shared/types/video-editor';

// 클립 복제 함수
export function duplicateVideoClip(clip: VideoClip, allClips: VideoClip[]): VideoClip {
  // 타임라인에서 가장 뒤에 있는 클립의 끝 위치 찾기
  let maxEndPosition = 0;
  allClips.forEach(c => {
    const clipEnd = c.position + c.duration;
    if (clipEnd > maxEndPosition) {
      maxEndPosition = clipEnd;
    }
  });
  
  const newClip: VideoClip = {
    ...clip,
    id: `clip-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    position: maxEndPosition, // 타임라인의 끝에 배치
  };
  
  return newClip;
}

export function duplicateTextClip(clip: TextClip, allClips: TextClip[]): TextClip {
  // 타임라인에서 가장 뒤에 있는 클립의 끝 위치 찾기
  let maxEndPosition = 0;
  allClips.forEach(c => {
    const clipEnd = c.position + c.duration;
    if (clipEnd > maxEndPosition) {
      maxEndPosition = clipEnd;
    }
  });
  
  const newClip: TextClip = {
    ...clip,
    id: `text-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    position: maxEndPosition, // 타임라인의 끝에 배치
  };
  
  return newClip;
}

export function duplicateSoundClip(clip: SoundClip, allClips: SoundClip[]): SoundClip {
  // 같은 레인의 클립들만 필터링하여 위치 계산
  const laneIndex = clip.laneIndex ?? 0;
  const laneClips = allClips.filter(c => (c.laneIndex ?? 0) === laneIndex);
  
  // 같은 레인에서 가장 뒤에 있는 클립의 끝 위치 찾기
  let maxEndPosition = 0;
  laneClips.forEach(c => {
    const clipEnd = c.position + c.duration;
    if (clipEnd > maxEndPosition) {
      maxEndPosition = clipEnd;
    }
  });
  
  const newClip: SoundClip = {
    ...clip,
    id: `sound-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    position: maxEndPosition, // 타임라인의 끝에 배치
  };
  
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
  
  // 클립의 실제 재생 시간 비율 계산
  const clipDurationInSeconds = clip.duration / pixelsPerSecond;
  const totalSourceDuration = originalEndTime - originalStartTime;
  
  // 분할 지점까지의 시간 (픽셀을 초로 변환)
  const splitTimeInPixels = splitPoint / pixelsPerSecond;
  // 원본 소스에서의 분할 시간 계산
  const splitTimeInSource = originalStartTime + (splitTimeInPixels / clipDurationInSeconds) * totalSourceDuration;
  
  // 첫 번째 클립: 처음부터 분할 지점까지
  const firstClip: VideoClip = {
    ...clip,
    duration: splitPoint,
    startTime: originalStartTime,
    endTime: splitTimeInSource,
  };
  
  // 두 번째 클립: 분할 지점부터 끝까지
  const secondClip: VideoClip = {
    ...clip,
    id: `clip-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    duration: clip.duration - splitPoint,
    position: splitPosition,
    startTime: splitTimeInSource,
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
  
  // 시간 계산 (비디오 클립과 동일한 로직)
  const originalStartTime = clip.startTime || 0;
  const originalEndTime = clip.endTime || (clip.maxDuration ? clip.maxDuration / pixelsPerSecond : clip.duration / pixelsPerSecond);
  
  // 클립의 실제 재생 시간 비율 계산
  const clipDurationInSeconds = clip.duration / pixelsPerSecond;
  const totalSourceDuration = originalEndTime - originalStartTime;
  
  // 분할 지점까지의 시간 (픽셀을 초로 변환)
  const splitTimeInPixels = splitPoint / pixelsPerSecond;
  // 원본 소스에서의 분할 시간 계산
  const splitTimeInSource = originalStartTime + (splitTimeInPixels / clipDurationInSeconds) * totalSourceDuration;
  
  // 첫 번째 클립: 처음부터 분할 지점까지
  const firstClip: SoundClip = {
    ...clip,
    duration: splitPoint,
    startTime: originalStartTime,
    endTime: splitTimeInSource,
  };
  
  // 두 번째 클립: 분할 지점부터 끝까지
  const secondClip: SoundClip = {
    ...clip,
    id: `sound-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    duration: clip.duration - splitPoint,
    position: splitPosition,
    startTime: splitTimeInSource,
    endTime: originalEndTime,
  };
  
  return { firstClip, secondClip };
}

/**
 * 리사이즈 시 트리밍 시작/끝 시간을 간소화된 규칙으로 갱신합니다.
 * - 왼쪽 핸들: startTime 조정, endTime은 기존 값 유지
 * - 오른쪽 핸들: endTime 조정, startTime은 기존 값 유지
 * - 최소/최대 제약 조건 단순 적용
 */
export function applyResizeTrim<T extends { duration: number; startTime?: number; endTime?: number; maxDuration?: number }>(
  clip: T,
  newDurationPx: number,
  handle?: 'left' | 'right',
  deltaPositionPx?: number,
  pixelsPerSecond: number = 40
): Partial<T> {
  // 최소 너비 보장
  const minDuration = 80;
  let safeDuration = Math.max(minDuration, newDurationPx);
  
  // maxDuration 제약 조건 적용
  if (clip.maxDuration && safeDuration > clip.maxDuration) {
    safeDuration = clip.maxDuration;
  }
  
  const updates: Partial<T> = { duration: safeDuration } as Partial<T>;
  const durationInSeconds = safeDuration / pixelsPerSecond;

  if (handle === 'left' && typeof deltaPositionPx === 'number') {
    // 왼쪽 핸들: endTime은 고정, startTime만 이동시키며 duration을 재계산
    const deltaSeconds = deltaPositionPx / pixelsPerSecond;
    const currentStart = clip.startTime ?? 0;

    // 현재 endTime(고정값) 산출: 명시된 endTime 우선, 없으면 (기존 startTime + 기존 duration)
    const fixedEndTime = ((): number => {
      if (typeof clip.endTime === 'number') return clip.endTime as number;
      const baseStart = clip.startTime ?? 0;
      return baseStart + (clip.duration / pixelsPerSecond);
    })();

    // 새 startTime 계산 및 최소 너비 보장 (endTime - startTime >= min)
    const minSeconds = minDuration / pixelsPerSecond;
    let newStart = Math.max(0, currentStart + deltaSeconds);
    if (newStart > fixedEndTime - minSeconds) {
      newStart = Math.max(0, fixedEndTime - minSeconds);
    }

    // duration은 고정된 endTime 기준으로 재계산
    const newDurationSeconds = Math.max(minSeconds, fixedEndTime - newStart);
    const newDurationPx = Math.round(newDurationSeconds * pixelsPerSecond);

    (updates as Record<string, unknown>).startTime = newStart;
    (updates as Record<string, unknown>).endTime = fixedEndTime;
    (updates as Record<string, unknown>).duration = Math.max(minDuration, newDurationPx);

  } else if (handle === 'right') {
    // 오른쪽 핸들: endTime만 조정
    const currentStart = clip.startTime ?? 0;
    const newEnd = currentStart + durationInSeconds;
    
    (updates as Record<string, unknown>).endTime = newEnd;
    
    // startTime은 기존 값 유지
    (updates as Record<string, unknown>).startTime = currentStart;
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