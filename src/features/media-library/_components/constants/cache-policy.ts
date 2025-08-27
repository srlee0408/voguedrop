/**
 * 라이브러리 캐시 정책 상수
 * 모든 훅에서 동일한 기본 stale/gc/refetch 정책을 사용하도록 중앙 관리합니다.
 */

export const LIBRARY_CACHE_POLICY = {
  clips: { staleTime: 2 * 60_000, gcTime: 15 * 60_000 },
  favorites: { staleTime: 2 * 60_000, gcTime: 10 * 60_000 },
  projects: { staleTime: 15 * 60_000, gcTime: 4 * 60 * 60_000 },
  uploads: { staleTime: 30 * 60_000, gcTime: 6 * 60 * 60_000 },
  combined: { staleTime: 10 * 60_000, gcTime: 3 * 60 * 60_000 },
} as const;

/** 실시간 모드 창(마지막 사용자 액션 후 n ms 동안은 staleTime=0 권장) */
export const REALTIME_WINDOW_MS = 5_000;


