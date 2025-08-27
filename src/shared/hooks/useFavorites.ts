'use client'

import { useCallback, useMemo, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/features/user-auth/_context/AuthContext'
import { LIBRARY_CACHE_KEYS } from '@/shared/components/modals/library/constants/cache-keys'

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
  isToggling: (videoId: string) => boolean
}

// API 호출 함수들
const fetchFavorites = async (userId: string | null): Promise<string[]> => {
  if (!userId) {
    return []
  }
  
  const response = await fetch('/api/canvas/favorites', {
    cache: 'no-store',
    headers: {
      'Cache-Control': 'no-store'
    }
  })
  
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
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    body: JSON.stringify({
      videoId,
      isFavorite,
    }),
    cache: 'no-store',
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
  const debounceTimers = useRef<Map<string, NodeJS.Timeout>>(new Map())
  const togglingItems = useRef<Set<string>>(new Set())
  
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
      await queryClient.cancelQueries({ queryKey: LIBRARY_CACHE_KEYS.infinite.clips('favorites', 20) })
      await queryClient.cancelQueries({ queryKey: LIBRARY_CACHE_KEYS.infinite.clips('regular', 50) })
      await queryClient.cancelQueries({ queryKey: ['canvas', 'history'] })

      // 이전 값들 백업
      const previousFavorites = queryClient.getQueryData<string[]>(['favorites', user?.id]) || []
      const previousLibraryFavorites = queryClient.getQueryData(LIBRARY_CACHE_KEYS.infinite.clips('favorites', 20))
      const previousLibraryRegular = queryClient.getQueryData(LIBRARY_CACHE_KEYS.infinite.clips('regular', 50))
      const previousCanvasHistory = queryClient.getQueryData(['canvas', 'history'])

      // 1. 즐겨찾기 ID 목록 즉시 업데이트
      const updatedFavorites = isFavorite 
        ? [...previousFavorites, videoId]
        : previousFavorites.filter(id => id !== videoId)
      
      queryClient.setQueryData(['favorites', user?.id], updatedFavorites)

      // 2. 라이브러리 즐겨찾기 리스트 즉시 업데이트
      if (previousLibraryFavorites) {
        queryClient.setQueryData(LIBRARY_CACHE_KEYS.infinite.clips('favorites', 20), (old: unknown) => {
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
        queryClient.setQueryData(LIBRARY_CACHE_KEYS.infinite.clips('regular', 50), (old: unknown) => {
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
        queryClient.setQueryData(LIBRARY_CACHE_KEYS.infinite.clips('favorites', 20), context.previousLibraryFavorites)
      }
      if (context?.previousLibraryRegular) {
        queryClient.setQueryData(LIBRARY_CACHE_KEYS.infinite.clips('regular', 50), context.previousLibraryRegular)
      }
      if (context?.previousCanvasHistory) {
        queryClient.setQueryData(['canvas', 'history'], context.previousCanvasHistory)
      }
      
      console.error('Error toggling favorite:', err)
    },
    onSuccess: () => {
      // 성공 시 즉시 캐시 갱신 (2초 지연 제거로 실시간 반영)
      queryClient.invalidateQueries({ 
        queryKey: ['favorites', user?.id]
      });
      
      // 통합된 캐시 키 사용으로 정확한 무효화
      queryClient.invalidateQueries({
        predicate: (query) => {
          const key = query.queryKey;
          return (key[0] === 'library' && key[1] === 'clips') ||
                 (key[0] === 'canvas' && key[1] === 'history');
        }
      });
    },
  })

  // 즐겨찾기 데이터를 Set으로 변환
  const favoriteIds = useMemo(() => {
    return new Set(favoritesQuery.data || [])
  }, [favoritesQuery.data])

  // 즐겨찾기 토글 (debounce 적용)
  const toggleFavorite = useCallback(async (videoId: string): Promise<void> => {
    if (!user) {
      throw new Error('로그인이 필요합니다.')
    }

    // 이미 진행 중인 경우 중복 실행 방지
    if (togglingItems.current.has(videoId)) {
      return;
    }

    // 기존 debounce 타이머 제거
    const existingTimer = debounceTimers.current.get(videoId);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // 진행 상태 추가
    togglingItems.current.add(videoId);

    const currentIsFavorite = favoriteIds.has(videoId);
    const newFavoriteState = !currentIsFavorite;

    // 300ms debounce 적용
    const timer = setTimeout(async () => {
      try {
        await toggleMutation.mutateAsync({ videoId, isFavorite: newFavoriteState });
      } catch (err) {
        console.error('Toggle favorite error:', err);
        throw err;
      } finally {
        // 진행 상태 제거
        togglingItems.current.delete(videoId);
        debounceTimers.current.delete(videoId);
      }
    }, 300);

    debounceTimers.current.set(videoId, timer);
  }, [favoriteIds, toggleMutation, user])

  // 특정 비디오가 즐겨찾기인지 확인
  const isFavorite = useCallback(
    (videoId: string): boolean => {
      return favoriteIds.has(videoId)
    },
    [favoriteIds]
  )

  // 특정 비디오가 토글 진행 중인지 확인
  const isToggling = useCallback(
    (videoId: string): boolean => {
      return togglingItems.current.has(videoId)
    },
    []
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
    isToggling,
    refreshFavorites,
  }
}