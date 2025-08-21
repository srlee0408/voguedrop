'use client'

import { useCallback, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/shared/lib/auth/AuthContext'
import type { FavoritesManagerReturn, FavoritesApiResponse } from '../_types'

// API 호출 함수들
const fetchFavorites = async (userId: string | null): Promise<string[]> => {
  if (!userId) {
    return []
  }
  
  const response = await fetch('/api/canvas/favorites')
  
  if (!response.ok) {
    throw new Error(`Failed to fetch favorites: ${response.status}`)
  }

  const data: FavoritesApiResponse = await response.json()
  return data.favoriteIds || []
}

const updateFavoriteStatus = async ({ 
  videoId, 
  isFavorite 
}: { 
  videoId: string
  isFavorite: boolean 
}): Promise<void> => {
  const response = await fetch('/api/canvas/favorite', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      videoId,
      isFavorite,
    }),
  })

  if (!response.ok) {
    throw new Error(`Failed to toggle favorite: ${response.status}`)
  }
}

/**
 * 즐겨찾기 상태와 API 통신을 관리하는 훅
 * React Query를 사용하여 캐싱과 낙관적 업데이트를 제공합니다.
 */
export function useFavoritesManager(): FavoritesManagerReturn {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  
  // 즐겨찾기 데이터 조회 (React Query)
  const favoritesQuery = useQuery({
    queryKey: ['favorites', user?.id],
    queryFn: () => fetchFavorites(user?.id || null),
    staleTime: 5 * 60 * 1000,  // 5분 - 즐겨찾기는 자주 변경될 수 있음
    gcTime: 10 * 60 * 1000,    // 10분
    enabled: !!user,           // 로그인된 경우에만 쿼리 실행
    retry: 2,
    retryDelay: 1000,
  })

  // 즐겨찾기 토글 mutation
  const toggleMutation = useMutation({
    mutationFn: updateFavoriteStatus,
    onMutate: async ({ videoId, isFavorite }) => {
      // 낙관적 업데이트를 위해 진행 중인 쿼리 취소
      await queryClient.cancelQueries({ queryKey: ['favorites', user?.id] })

      // 이전 값 백업
      const previousFavorites = queryClient.getQueryData<string[]>(['favorites', user?.id]) || []

      // 낙관적 업데이트
      const updatedFavorites = isFavorite 
        ? [...previousFavorites, videoId]
        : previousFavorites.filter(id => id !== videoId)
      
      queryClient.setQueryData(['favorites', user?.id], updatedFavorites)

      // 롤백용 데이터 반환
      return { previousFavorites }
    },
    onError: (err, variables, context) => {
      // 에러 시 이전 상태로 롤백
      if (context?.previousFavorites) {
        queryClient.setQueryData(['favorites', user?.id], context.previousFavorites)
      }
      
      console.error('Error toggling favorite:', err)
    },
    onSettled: () => {
      // 완료 후 쿼리 무효화 (서버 상태와 동기화)
      queryClient.invalidateQueries({ queryKey: ['favorites', user?.id] })
    },
  })

  // 즐겨찾기 데이터를 Set으로 변환 (기존 인터페이스 유지)
  const favoriteIds = useMemo(() => {
    return new Set(favoritesQuery.data || [])
  }, [favoritesQuery.data])

  // 즐겨찾기 토글 (기존 인터페이스 유지)
  const toggleFavorite = useCallback(async (videoId: string): Promise<void> => {
    if (!user) {
      throw new Error('로그인이 필요합니다.')
    }

    const currentIsFavorite = favoriteIds.has(videoId)
    const newFavoriteState = !currentIsFavorite

    try {
      await toggleMutation.mutateAsync({ videoId, isFavorite: newFavoriteState })
    } catch (err) {
      // 에러를 다시 throw하여 호출자가 처리할 수 있도록 함
      throw err
    }
  }, [favoriteIds, toggleMutation, user])

  // 특정 비디오가 즐겨찾기인지 확인 (기존 인터페이스 유지)
  const isFavorite = useCallback(
    (videoId: string): boolean => {
      return favoriteIds.has(videoId)
    },
    [favoriteIds]
  )

  // 즐겨찾기 새로고침 (기존 인터페이스 유지)
  const refreshFavorites = useCallback(async (): Promise<void> => {
    await favoritesQuery.refetch()
  }, [favoritesQuery])

  return {
    favoriteIds,
    isLoading: favoritesQuery.isLoading || toggleMutation.isPending,
    error: favoritesQuery.error?.message || toggleMutation.error?.message || null,
    toggleFavorite,
    isFavorite,
    refreshFavorites,
  }
}