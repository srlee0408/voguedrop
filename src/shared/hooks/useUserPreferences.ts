/**
 * useUserPreferences - 사용자 환경설정 관리 훅
 * 
 * 주요 역할:
 * 1. 사용자 프로필 정보 조회 및 환경설정 관리
 * 2. 타임라인 겹침 대체 정책 설정 (ask, always_replace, never_replace)
 * 3. React Query 기반 서버 상태 관리 및 캐싱
 * 4. 환경설정 업데이트 시 즉시 캐시 무효화
 * 
 * 핵심 특징:
 * - overlap_replace_preference 타입 안전성 보장
 * - 프로필 로드/업데이트 분리된 API 통신
 * - 업데이트 성공 시 자동 캐시 무효화
 * - 에러 처리 및 로딩 상태 제공
 * - 클라이언트 전용 훅
 * 
 * 주의사항:
 * - /api/user/profile 엔드포인트와 연동
 * - 캐시 정책은 no-store로 항상 최신 데이터 보장
 * - 업데이트 실패 시 상세한 에러 메시지 제공
 */
'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

export type OverlapPreference = 'ask' | 'always_replace' | 'never_replace'

interface UserProfileResponse {
  user_id: string
  overlap_replace_preference: OverlapPreference
}

/**
 * 사용자 환경설정 로드/업데이트 훅
 * - React Query를 사용해 /api/user/profile 과 통신합니다.
 */
export function useUserPreferences() {
  const queryClient = useQueryClient()

  const profileQuery = useQuery<UserProfileResponse>({
    queryKey: ['userProfile'],
    queryFn: async () => {
      const res = await fetch('/api/user/profile', { cache: 'no-store' })
      if (!res.ok) throw new Error('Failed to load user profile')
      return res.json()
    },
  })

  const updatePreference = useMutation({
    mutationFn: async (pref: OverlapPreference) => {
      const res = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ overlap_replace_preference: pref }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data?.error ?? 'Failed to update preference')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userProfile'] })
    },
  })

  return {
    profile: profileQuery.data,
    is_loading: profileQuery.isLoading,
    is_error: profileQuery.isError,
    update_overlap_preference: updatePreference.mutateAsync,
    is_updating: updatePreference.isPending,
  }
}


