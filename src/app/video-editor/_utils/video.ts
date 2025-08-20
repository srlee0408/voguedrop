/**
 * 비디오 관련 유틸리티 함수들
 */

/**
 * 초 단위 시간을 MM:SS 형식으로 포맷팅
 * @param seconds - 초 단위 시간
 * @returns MM:SS 형식의 문자열
 */
export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * 프레임을 초로 변환 (30fps 기준)
 * @param frames - 프레임 수
 * @param fps - 초당 프레임 수 (기본값: 30)
 * @returns 초 단위 시간
 */
export function framesToSeconds(frames: number, fps: number = 30): number {
  return frames / fps;
}

/**
 * 초를 프레임으로 변환 (30fps 기준)
 * @param seconds - 초 단위 시간
 * @param fps - 초당 프레임 수 (기본값: 30)
 * @returns 프레임 수
 */
export function secondsToFrames(seconds: number, fps: number = 30): number {
  return Math.round(seconds * fps);
}

/**
 * 픽셀을 초로 변환 (타임라인 기준 40px = 1초)
 * @param pixels - 픽셀 수
 * @param pixelsPerSecond - 초당 픽셀 수 (기본값: 40)
 * @returns 초 단위 시간
 */
export function pixelsToSeconds(pixels: number, pixelsPerSecond: number = 40): number {
  return pixels / pixelsPerSecond;
}

/**
 * 초를 픽셀로 변환 (타임라인 기준 40px = 1초)
 * @param seconds - 초 단위 시간
 * @param pixelsPerSecond - 초당 픽셀 수 (기본값: 40)
 * @returns 픽셀 수
 */
export function secondsToPixels(seconds: number, pixelsPerSecond: number = 40): number {
  return seconds * pixelsPerSecond;
}