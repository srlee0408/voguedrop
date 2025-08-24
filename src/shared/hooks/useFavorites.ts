'use client'

import { useCallback, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/shared/lib/auth/AuthContext'

interface FavoritesApiResponse {
  favoriteIds: string[]
}

interface FavoritesReturn {
  favoriteIds: Set<string>
  isLoading: boolean
  error: string | null
  toggleFavorite: (videoId: string) => Promise<void>
  isFavorite: (videoId: string) => boolean
  refreshFavorites: () => Promise<void>
}

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
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.error || `Failed to toggle favorite: ${response.status}`)
  }
}

/**
 * 전역 즐겨찾기 상태와 API 통신을 관리하는 공통 훅
 * Canvas 슬롯과 Library 모달에서 공유하여 일관된 즐겨찾기 관리를 제공합니다.
 * React Query를 사용하여 캐싱과 낙관적 업데이트를 제공합니다.
 */
export function useFavorites(): FavoritesReturn {
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
      // 진행 중인 모든 관련 쿼리 취소
      await queryClient.cancelQueries({ queryKey: ['favorites', user?.id] })
      await queryClient.cancelQueries({ queryKey: ['library-infinite', 'favorites'] })
      await queryClient.cancelQueries({ queryKey: ['library-infinite', 'regular'] })
      await queryClient.cancelQueries({ queryKey: ['canvas', 'history'] })

      // 이전 값들 백업
      const previousFavorites = queryClient.getQueryData<string[]>(['favorites', user?.id]) || []
      const previousLibraryFavorites = queryClient.getQueryData(['library-infinite', 'favorites', 20])
      const previousLibraryRegular = queryClient.getQueryData(['library-infinite', 'regular', 20])
      const previousCanvasHistory = queryClient.getQueryData(['canvas', 'history'])

      // 1. 즐겨찾기 ID 목록 즉시 업데이트
      const updatedFavorites = isFavorite 
        ? [...previousFavorites, videoId]
        : previousFavorites.filter(id => id !== videoId)
      
      queryClient.setQueryData(['favorites', user?.id], updatedFavorites)

      // 2. 라이브러리 즐겨찾기 리스트 즉시 업데이트
      if (previousLibraryFavorites) {
        queryClient.setQueryData(['library-infinite', 'favorites', 20], (old: unknown) => {
          if (!old || typeof old !== 'object' || !('pages' in old)) return old
          
          const typedOld = old as { pages: Array<{ clips?: Array<{ id: string | number, is_favorite?: boolean }>, totalCount?: number }> }
          
          // 즐겨찾기 추가 시 regular 쿼리에서 해당 클립 찾아서 추가
          let newClip = null;
          if (isFavorite && previousLibraryRegular) {
            const regularData = previousLibraryRegular as { pages: Array<{ clips?: Array<{ id: string | number, is_favorite?: boolean }> }> };
            for (const page of regularData.pages) {
              const foundClip = page.clips?.find(clip => String(clip.id) === videoId);
              if (foundClip) {
                newClip = { ...foundClip, is_favorite: true };
                break;
              }
            }
          }
          
          return {
            ...typedOld,
            pages: typedOld.pages.map((page, index) => ({
              ...page,
              clips: isFavorite 
                ? (index === 0 && newClip) ? [newClip, ...(page.clips || [])] : page.clips // 첫 페이지 맨 앞에 추가
                : page.clips?.filter((clip) => String(clip.id) !== videoId) || [],
              totalCount: isFavorite 
                ? (page.totalCount || 0) + (index === 0 && newClip ? 1 : 0)
                : Math.max(0, (page.totalCount || 0) - 1)
            }))
          }
        })
      }

      // 3. 라이브러리 일반 리스트의 is_favorite 상태 즉시 업데이트
      if (previousLibraryRegular) {
        queryClient.setQueryData(['library-infinite', 'regular', 20], (old: unknown) => {
          if (!old || typeof old !== 'object' || !('pages' in old)) return old
          
          const typedOld = old as { pages: Array<{ clips?: Array<{ id: string | number, is_favorite?: boolean }> }> }
          
          return {
            ...typedOld,
            pages: typedOld.pages.map((page) => ({
              ...page,
              clips: page.clips?.map((clip) => 
                String(clip.id) === videoId 
                  ? { ...clip, is_favorite: isFavorite }
                  : clip
              ) || []
            }))
          }
        })
      }

      // 4. Canvas 히스토리의 is_favorite 상태 즉시 업데이트
      if (previousCanvasHistory) {
        queryClient.setQueryData(['canvas', 'history'], (old: unknown) => {
          if (!old || typeof old !== 'object' || !('pages' in old)) return old
          
          const typedOld = old as { pages: Array<{ generations?: Array<{ id: string | number, is_favorite?: boolean }> }> }
          
          return {
            ...typedOld,
            pages: typedOld.pages.map((page) => ({
              ...page,
              generations: page.generations?.map((gen) => 
                String(gen.id) === videoId 
                  ? { ...gen, is_favorite: isFavorite }
                  : gen
              ) || []
            }))
          }
        })
      }

      // 롤백용 데이터 반환
      return { 
        previousFavorites,
        previousLibraryFavorites,
        previousLibraryRegular,
        previousCanvasHistory
      }
    },
    onError: (err, _variables, context) => {
      // 에러 시 모든 상태를 이전으로 롤백
      if (context?.previousFavorites) {
        queryClient.setQueryData(['favorites', user?.id], context.previousFavorites)
      }
      if (context?.previousLibraryFavorites) {
        queryClient.setQueryData(['library-infinite', 'favorites', 20], context.previousLibraryFavorites)
      }
      if (context?.previousLibraryRegular) {
        queryClient.setQueryData(['library-infinite', 'regular', 20], context.previousLibraryRegular)
      }
      if (context?.previousCanvasHistory) {
        queryClient.setQueryData(['canvas', 'history'], context.previousCanvasHistory)
      }
      
      console.error('Error toggling favorite:', err)
    },
    onSuccess: () => {
      // 성공 시에는 백그라운드에서 조용히 동기화 (UI 깜빡임 방지)
      setTimeout(() => {
        queryClient.invalidateQueries({ 
          queryKey: ['favorites', user?.id],
          refetchType: 'none' // 데이터 리페칭 없이 캐시만 stale로 표시
        })
        queryClient.invalidateQueries({ 
          queryKey: ['library-infinite'],
          refetchType: 'none'
        })
        queryClient.invalidateQueries({ 
          queryKey: ['canvas', 'history'],
          refetchType: 'none'
        })
      }, 2000) // 2초 후 백그라운드 동기화
    },
  })

  // 즐겨찾기 데이터를 Set으로 변환
  const favoriteIds = useMemo(() => {
    return new Set(favoritesQuery.data || [])
  }, [favoritesQuery.data])

  // 즐겨찾기 토글
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

  // 특정 비디오가 즐겨찾기인지 확인
  const isFavorite = useCallback(
    (videoId: string): boolean => {
      return favoriteIds.has(videoId)
    },
    [favoriteIds]
  )

  // 즐겨찾기 새로고침
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