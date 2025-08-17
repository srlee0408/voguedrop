/**
 * 사운드 생성 관련 유틸리티 함수
 */

/**
 * 사운드 타이틀 처리 함수
 * 타이틀이 없으면 프롬프트의 첫 부분을 타이틀로 사용
 * @param title - 사용자가 입력한 타이틀 (선택사항)
 * @param prompt - 사운드 생성 프롬프트
 * @param maxLength - 타이틀 최대 길이 (기본값: 50)
 * @returns 처리된 타이틀
 */
export function processSoundTitle(
  title: string | undefined | null,
  prompt: string,
  maxLength: number = 50
): string {
  // 타이틀이 제공되고 비어있지 않으면 그대로 사용
  if (title && title.trim().length > 0) {
    return title.trim();
  }
  
  // 타이틀이 없으면 프롬프트를 타이틀로 사용
  const trimmedPrompt = prompt.trim();
  
  // 프롬프트가 maxLength보다 길면 잘라내고 '...' 추가
  if (trimmedPrompt.length > maxLength) {
    // 마지막 단어를 잘라내지 않도록 처리
    const truncated = trimmedPrompt.substring(0, maxLength);
    const lastSpaceIndex = truncated.lastIndexOf(' ');
    
    // 공백이 있으면 그 위치까지만 사용
    if (lastSpaceIndex > maxLength * 0.5) {
      return truncated.substring(0, lastSpaceIndex) + '...';
    }
    
    return truncated + '...';
  }
  
  return trimmedPrompt;
}

/**
 * 비디오 기반 사운드 타이틀 생성
 * @param videoTitle - 비디오 타이틀
 * @param variationNumber - 변형 번호 (선택사항)
 * @returns 생성된 타이틀
 */
export function generateVideoSoundTitle(
  videoTitle: string,
  variationNumber?: number
): string {
  if (variationNumber !== undefined) {
    return `${videoTitle} - Soundtrack ${variationNumber}`;
  }
  return `${videoTitle} - Soundtrack`;
}

/**
 * job_id에서 앞 5자리 추출
 * @param jobId - 전체 job_id (예: "job_3FpXr7k9...")
 * @returns job_id의 앞 5자리 (예: "3FpXr")
 */
export function extractJobIdPrefix(jobId: string): string {
  // "job_" 접두사 제거하고 앞 5자리 추출
  const idWithoutPrefix = jobId.startsWith('job_') ? jobId.substring(4) : jobId;
  return idWithoutPrefix.substring(0, 5);
}

/**
 * 사운드 그룹화를 위한 그룹 ID 생성
 * @param prefix - ID 접두사 (기본값: 'group')
 * @returns 생성된 그룹 ID
 */
export function generateSoundGroupId(prefix: string = 'group'): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 9);
  return `${prefix}_${timestamp}_${random}`;
}

/**
 * 사운드 히스토리 표시용 타이틀 포맷팅
 * 타이틀이 있으면 타이틀을, 없으면 프롬프트를 반환
 * @param title - 저장된 타이틀
 * @param prompt - 저장된 프롬프트
 * @param maxLength - 최대 표시 길이
 * @returns 포맷된 표시 텍스트
 */
export function formatSoundDisplayTitle(
  title: string | null,
  prompt: string,
  maxLength: number = 60
): string {
  const displayText = title && title.trim() ? title.trim() : prompt.trim();
  
  if (displayText.length > maxLength) {
    const truncated = displayText.substring(0, maxLength);
    const lastSpaceIndex = truncated.lastIndexOf(' ');
    
    if (lastSpaceIndex > maxLength * 0.5) {
      return truncated.substring(0, lastSpaceIndex) + '...';
    }
    
    return truncated + '...';
  }
  
  return displayText;
}