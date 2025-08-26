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


