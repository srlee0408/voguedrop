/**
 * 상대적인 시간 포맷 (예: "5분 전", "1시간 전")
 */
export function formatRelativeTime(date: Date | string): string {
  const now = new Date();
  const past = new Date(date);
  const diffInSeconds = Math.floor((now.getTime() - past.getTime()) / 1000);

  if (diffInSeconds < 60) {
    return '방금 전';
  } else if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60);
    return `${minutes}분 전`;
  } else if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600);
    return `${hours}시간 전`;
  } else if (diffInSeconds < 604800) {
    const days = Math.floor(diffInSeconds / 86400);
    return `${days}일 전`;
  } else {
    return past.toLocaleDateString('ko-KR');
  }
}

export const SESSION_COOKIE_NAME = 'vogue_session_id';
export const SESSION_COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30일

/**
 * 클라이언트에서 세션 ID를 가져옵니다.
 */
export function getClientSessionId(): string | null {
  if (typeof window === 'undefined') return null;
  
  const cookies = document.cookie.split(';');
  const sessionCookie = cookies.find(cookie => 
    cookie.trim().startsWith(`${SESSION_COOKIE_NAME}=`)
  );
  
  if (sessionCookie) {
    return sessionCookie.split('=')[1];
  }
  
  return null;
}