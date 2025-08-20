import { cookies } from 'next/headers';
import { v4 as uuidv4 } from 'uuid';
import { SESSION_COOKIE_NAME, SESSION_COOKIE_MAX_AGE } from './session';

/**
 * 세션 ID를 가져오거나 생성합니다.
 * 서버 컴포넌트/API 라우트에서만 사용 가능합니다.
 */
export async function getOrCreateSessionId(): Promise<string> {
  const cookieStore = await cookies();
  const existingSessionId = cookieStore.get(SESSION_COOKIE_NAME);

  if (existingSessionId?.value) {
    return existingSessionId.value;
  }

  // 새 세션 ID 생성
  const newSessionId = `anonymous_${uuidv4()}`;
  
  cookieStore.set(SESSION_COOKIE_NAME, newSessionId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_COOKIE_MAX_AGE,
    path: '/',
  });

  return newSessionId;
}