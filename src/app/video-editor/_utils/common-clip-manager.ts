import { SoundClip, VideoClip, TextClip } from '@/shared/types/video-editor';
import { duplicateClip, splitClip, CommonClip, ClipType, isSoundClip, isVideoClip, isTextClip } from './common-clip-utils';
import { applyResizeTrim, splitVideoClip, splitTextClip, splitSoundClip } from './clip-operations';

/**
 * 공통 클립 관리 클래스
 * 모든 클립 타입에 대한 CRUD 및 변환 작업을 제공
 */
export class CommonClipManager {
  /**
   * 클립 삭제
   */
  static deleteClip<T extends CommonClip>(
    clipId: string,
    clips: T[],
    updateFunction: (clips: T[]) => void,
    onHistorySave?: () => void
  ): void {
    const updatedClips = clips.filter(c => c.id !== clipId);
    updateFunction(updatedClips);
    onHistorySave?.();
  }

  /**
   * 클립 복제
   */
  static duplicateClip<T extends CommonClip>(
    clipId: string,
    clips: T[],
    updateFunction: (clips: T[]) => void,
    onHistorySave?: () => void
  ): void {
    duplicateClip(clipId, clips, updateFunction);
    onHistorySave?.();
  }

  /**
   * 클립 분할
   */
  static splitClip<T extends CommonClip>(
    clipId: string,
    currentTime: number,
    pixelsPerSecond: number,
    clips: T[],
    updateFunction: (clips: T[]) => void,
    onHistorySave?: () => void
  ): void {
    const clip = clips.find(c => c.id === clipId) as CommonClip | undefined;
    if (!clip) return;

    // 플레이헤드 기준 절대 픽셀 위치 계산
    const playheadPosPx = currentTime * pixelsPerSecond;

    let firstPart: CommonClip | null = null;
    let secondPart: CommonClip | null = null;

    try {
      if (isVideoClip(clip)) {
        const result = splitVideoClip(clip as VideoClip, playheadPosPx, pixelsPerSecond);
        if (result) { firstPart = result.firstClip; secondPart = result.secondClip; }
      } else if (isSoundClip(clip)) {
        const result = splitSoundClip(clip as SoundClip, playheadPosPx, pixelsPerSecond);
        if (result) { firstPart = result.firstClip; secondPart = result.secondClip; }
      } else if (isTextClip(clip)) {
        const result = splitTextClip(clip as TextClip, playheadPosPx);
        if (result) { firstPart = result.firstClip; secondPart = result.secondClip; }
      } else {
        // Fallback to generic split (duration/position only)
        splitClip(clipId, currentTime, pixelsPerSecond, clips, updateFunction);
        onHistorySave?.();
        return;
      }

      if (firstPart && secondPart) {
        const updatedClips = clips.map(c => c.id === clipId ? (firstPart as T) : c);
        updateFunction([ ...updatedClips, secondPart as T ]);
        onHistorySave?.();
      }
    } catch {
      // 안전망: 문제가 생기면 제네릭 분할로 대체
      splitClip(clipId, currentTime, pixelsPerSecond, clips, updateFunction);
      onHistorySave?.();
    }
  }

  /**
   * 클립 위치 업데이트
   */
  static updateClipPosition<T extends CommonClip>(
    clipId: string,
    newPosition: number,
    clips: T[],
    updateFunction: (clips: T[]) => void,
    onHistorySave?: () => void
  ): void {
    const updatedClips = clips.map(clip =>
      clip.id === clipId ? { ...clip, position: newPosition } as T : clip
    );
    updateFunction(updatedClips);
    onHistorySave?.();
  }

  /**
   * 클립 리사이즈
   */
  static resizeClip<T extends CommonClip>(
    clipId: string,
    newDuration: number,
    clips: T[],
    updateFunction: (clips: T[]) => void,
    handle?: 'left' | 'right',
    deltaPosition?: number,
    onHistorySave?: () => void
  ): void {
    const PIXELS_PER_SECOND_DEFAULT = 40;
    const updatedClips = clips.map(clip => {
      if (clip.id !== clipId) return clip;

      // 시간 트리밍 필드를 가진 경우 공통 트리밍 유틸 사용 (비디오/사운드)
      if ('maxDuration' in clip || 'startTime' in clip || 'endTime' in clip) {
        const updates = applyResizeTrim(
          clip as VideoClip | SoundClip,
          newDuration,
          handle,
          deltaPosition,
          PIXELS_PER_SECOND_DEFAULT
        );
        return { ...(clip as T), ...(updates as Partial<T>) } as T;
      }

      // 텍스트 등 단순 duration만 가지는 경우 기존 로직 유지
      const updatedClip = { ...clip, duration: newDuration } as T;
      if (handle === 'left' && deltaPosition !== undefined) {
        (updatedClip as unknown as { position: number }).position = clip.position + deltaPosition;
      }
      return updatedClip;
    });
    updateFunction(updatedClips);
    onHistorySave?.();
  }

  /**
   * 클립 배열 재정렬
   */
  static reorderClips<T extends CommonClip>(
    newClips: T[],
    updateFunction: (clips: T[]) => void,
    onHistorySave?: () => void
  ): void {
    updateFunction(newClips);
    onHistorySave?.();
  }

  /**
   * 모든 클립 업데이트
   */
  static updateAllClips<T extends CommonClip>(
    newClips: T[],
    updateFunction: (clips: T[]) => void,
    onHistorySave?: () => void
  ): void {
    updateFunction(newClips);
    onHistorySave?.();
  }

  /**
   * 클립 검색
   */
  static findClip<T extends CommonClip>(
    clipId: string,
    clips: T[]
  ): T | undefined {
    return clips.find(clip => clip.id === clipId);
  }

  /**
   * 특정 레인의 클립들 가져오기
   */
  static getClipsByLane<T extends CommonClip>(
    clips: T[],
    laneIndex: number
  ): T[] {
    return clips.filter(clip => (clip.laneIndex ?? 0) === laneIndex);
  }

  /**
   * 클립 레인 변경
   */
  static updateClipLane<T extends CommonClip>(
    clipId: string,
    newLaneIndex: number,
    clips: T[],
    updateFunction: (clips: T[]) => void,
    onHistorySave?: () => void
  ): void {
    const updatedClips = clips.map(clip =>
      clip.id === clipId ? { ...clip, laneIndex: newLaneIndex } as T : clip
    );
    updateFunction(updatedClips);
    onHistorySave?.();
  }

  /**
   * 클립 타입별 특수 기능 - 사운드 볼륨 조정
   */
  static updateSoundVolume(
    clipId: string,
    volume: number,
    soundClips: SoundClip[],
    updateFunction: (clips: SoundClip[]) => void,
    onHistorySave?: () => void
  ): void {
    const updatedClips = soundClips.map(clip =>
      clip.id === clipId ? { ...clip, volume } : clip
    );
    updateFunction(updatedClips);
    onHistorySave?.();
  }

  /**
   * 클립 타입별 특수 기능 - 사운드 페이드 조정
   */
  static updateSoundFade(
    clipId: string,
    fadeType: 'fadeIn' | 'fadeOut',
    duration: number,
    soundClips: SoundClip[],
    updateFunction: (clips: SoundClip[]) => void,
    onHistorySave?: () => void
  ): void {
    const updatedClips = soundClips.map(clip => {
      if (clip.id === clipId) {
        if (fadeType === 'fadeIn') {
          return { ...clip, fadeInDuration: duration };
        } else {
          return { ...clip, fadeOutDuration: duration };
        }
      }
      return clip;
    });
    updateFunction(updatedClips);
    onHistorySave?.();
  }

  /**
   * 클립 유효성 검증
   */
  static validateClip<T extends CommonClip>(clip: T): boolean {
    return !!(
      clip.id &&
      typeof clip.duration === 'number' &&
      clip.duration > 0 &&
      typeof clip.position === 'number' &&
      clip.position >= 0
    );
  }

  /**
   * 클립들의 총 지속시간 계산
   */
  static calculateTotalDuration<T extends CommonClip>(clips: T[]): number {
    if (clips.length === 0) return 0;
    
    return clips.reduce((max, clip) => {
      const endPosition = clip.position + clip.duration;
      return Math.max(max, endPosition);
    }, 0);
  }

  /**
   * 클립 타입 감지
   */
  static getClipType(clip: CommonClip): ClipType {
    if ('url' in clip && 'thumbnails' in clip) return 'video';
    if ('content' in clip && 'style' in clip) return 'text';
    if ('volume' in clip && 'name' in clip) return 'sound';
    throw new Error('Unknown clip type');
  }
}