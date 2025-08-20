'use client'

import { useState, useCallback, useEffect } from 'react'
import { useAuth } from '@/shared/lib/auth/AuthContext'
import type { FavoritesManagerReturn, FavoritesApiResponse } from '../_types'

/**
 * 즐겨찾기 상태와 API 통신을 관리하는 훅
 * page.tsx에서 분리하여 단일 책임 원칙 준수
 */
export function useFavoritesManager(): FavoritesManagerReturn {
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set())
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const { user } = useAuth()

  // 초기 즐겨찾기 로드
  const loadFavorites = useCallback(async (): Promise<void> => {
    if (!user) {
      setFavoriteIds(new Set())
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/canvas/favorites')
      
      if (!response.ok) {
        throw new Error(`Failed to fetch favorites: ${response.status}`)
      }

      const data: FavoritesApiResponse = await response.json()
      
      if (data.favoriteIds) {
        setFavoriteIds(new Set(data.favoriteIds))
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load favorites'
      console.error('Failed to load favorites:', err)
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }, [user])

  // 즐겨찾기 토글
  const toggleFavorite = useCallback(async (videoId: string): Promise<void> => {
    if (!user) {
      setError('로그인이 필요합니다.')
      return
    }

    const currentIsFavorite = favoriteIds.has(videoId)
    const newFavoriteState = !currentIsFavorite

    // 낙관적 업데이트
    setFavoriteIds((prev) => {
      const newSet = new Set(prev)
      if (newFavoriteState) {
        newSet.add(videoId)
      } else {
        newSet.delete(videoId)
      }
      return newSet
    })

    try {
      const response = await fetch('/api/canvas/favorite', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoId,
          isFavorite: newFavoriteState,
        }),
      })

      if (!response.ok) {
        throw new Error(`Failed to toggle favorite: ${response.status}`)
      }

      // 성공 시 에러 클리어
      setError(null)
    } catch (err) {
      // 실패 시 롤백
      setFavoriteIds((prev) => {
        const newSet = new Set(prev)
        if (currentIsFavorite) {
          newSet.add(videoId)
        } else {
          newSet.delete(videoId)
        }
        return newSet
      })

      const errorMessage = err instanceof Error ? err.message : 'Failed to toggle favorite'
      console.error('Error toggling favorite:', err)
      setError(errorMessage)
      
      // 에러를 다시 throw하여 호출자가 처리할 수 있도록 함
      throw err
    }
  }, [favoriteIds, user])

  // 특정 비디오가 즐겨찾기인지 확인
  const isFavorite = useCallback(
    (videoId: string): boolean => {
      return favoriteIds.has(videoId)
    },
    [favoriteIds]
  )

  // 즐겨찾기 새로고침
  const refreshFavorites = useCallback(async (): Promise<void> => {
    await loadFavorites()
  }, [loadFavorites])

  // 컴포넌트 마운트 시 즐겨찾기 로드
  useEffect(() => {
    loadFavorites()
  }, [loadFavorites])

  return {
    favoriteIds,
    isLoading,
    error,
    toggleFavorite,
    isFavorite,
    refreshFavorites,
  }
}