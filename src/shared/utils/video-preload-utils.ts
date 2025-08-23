/**
 * 비디오 프리로드 관련 유틸리티 함수들
 */

/**
 * 비디오 URL이 프리로드하기에 안전한지 확인
 */
export function isVideoUrlSafe(url: string | undefined): boolean {
  if (!url) return false;
  
  try {
    const urlObj = new URL(url);
    
    // HTTPS만 허용
    if (urlObj.protocol !== 'https:') return false;
    
    // 허용된 호스트 목록 (CDN 및 신뢰할 수 있는 스토리지)
    const allowedHosts = [
      'fal.media',
      'v3.fal.media',
      'supabase.co',
      'storage.googleapis.com',
      'amazonaws.com',
      'cloudflare.com',
      'vercel.app'
    ];
    
    return allowedHosts.some(host => urlObj.hostname.includes(host));
  } catch {
    return false;
  }
}

/**
 * 네트워크 상태가 비디오 프리로드에 적합한지 확인
 */
export function isNetworkSuitableForPreload(): boolean {
  // 네트워크 정보가 없으면 기본적으로 허용
  if (!('connection' in navigator)) return true;
  
  const connection = (navigator as unknown as { connection?: { effectiveType: string } }).connection;
  if (!connection) return true;
  
  // 느린 연결에서는 프리로드 비활성화
  const slowConnections = ['slow-2g', '2g'];
  return !slowConnections.includes(connection.effectiveType);
}

/**
 * 사용자 설정에 따른 데이터 절약 모드 확인
 */
export function isDataSaverEnabled(): boolean {
  if (!('connection' in navigator)) return false;
  
  const connection = (navigator as unknown as { connection?: { saveData?: boolean } }).connection;
  return connection?.saveData === true;
}

/**
 * 비디오 프리로드 가능 여부를 종합적으로 판단
 */
export function shouldPreloadVideo(url: string | undefined): boolean {
  // 기본 안전성 검사
  if (!isVideoUrlSafe(url)) return false;
  
  // 데이터 절약 모드에서는 프리로드 비활성화
  if (isDataSaverEnabled()) return false;
  
  // 네트워크 상태 확인
  if (!isNetworkSuitableForPreload()) return false;
  
  return true;
}

/**
 * 안전한 비디오 엘리먼트 생성 및 설정
 */
export function createSafeVideoElement(url: string): HTMLVideoElement | null {
  if (!shouldPreloadVideo(url)) return null;
  
  try {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.crossOrigin = 'anonymous';
    video.muted = true;
    
    // 타임아웃 설정 (10초)
    const timeout = setTimeout(() => {
      video.src = '';
      video.load();
    }, 10000);
    
    // 로드 완료시 타임아웃 클리어
    video.addEventListener('canplay', () => {
      clearTimeout(timeout);
    }, { once: true });
    
    // 에러 시 타임아웃 클리어
    video.addEventListener('error', () => {
      clearTimeout(timeout);
    }, { once: true });
    
    return video;
  } catch {
    return null;
  }
}