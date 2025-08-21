"use client"

import { createContext, useContext, ReactNode, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { EffectTemplateWithMedia } from '@/shared/types/database'

interface Category {
  id: number
  name: string
}

interface EffectsDataContextType {
  effects: EffectTemplateWithMedia[]
  categories: Category[]
  isLoading: boolean
  error: string | null
  refetchEffects: () => Promise<void>
  getEffectsByCategory: (category: string) => EffectTemplateWithMedia[]
  getRepresentativeEffects: () => EffectTemplateWithMedia[]
}

// API 호출 함수들
const fetchEffects = async (): Promise<EffectTemplateWithMedia[]> => {
  const response = await fetch('/api/canvas/effects?category=all')
  if (!response.ok) {
    throw new Error('Failed to fetch effects')
  }
  const data = await response.json()
  return data.effects || []
}

const fetchCategories = async (): Promise<Category[]> => {
  const response = await fetch('/api/canvas/categories')
  if (!response.ok) {
    throw new Error('Failed to fetch categories')
  }
  const data = await response.json()
  return data.categories || []
}

const EffectsDataContext = createContext<EffectsDataContextType | undefined>(undefined)

export function EffectsDataProvider({ children }: { children: ReactNode }) {
  // React Query를 사용하여 effects 데이터 관리
  const effectsQuery = useQuery({
    queryKey: ['effects', 'all'],
    queryFn: fetchEffects,
    staleTime: 30 * 60 * 1000, // 30분 - 효과 데이터는 자주 변경되지 않음
    gcTime: 60 * 60 * 1000,    // 1시간
    retry: 2,
    retryDelay: 1500,
  })

  // React Query를 사용하여 categories 데이터 관리  
  const categoriesQuery = useQuery({
    queryKey: ['categories'],
    queryFn: fetchCategories,
    staleTime: 30 * 60 * 1000, // 30분
    gcTime: 60 * 60 * 1000,    // 1시간
    retry: 2,
    retryDelay: 1500,
  })

  // React Query 데이터를 메모이제이션으로 안정화
  const effects = useMemo(() => effectsQuery.data || [], [effectsQuery.data])
  const categories = useMemo(() => categoriesQuery.data || [], [categoriesQuery.data])
  const isLoading = effectsQuery.isLoading || categoriesQuery.isLoading
  const error = effectsQuery.error?.message || categoriesQuery.error?.message || null

  // 카테고리별 효과 필터링 함수 (메모이제이션으로 성능 최적화)
  const getEffectsByCategory = useMemo(() => {
    return (category: string) => {
      if (category === 'all' || category === 'All') {
        return effects
      }
      
      // 카테고리 이름을 소문자로 정규화
      const normalizedCategory = category.toLowerCase()
      return effects.filter(effect => effect.category?.name === normalizedCategory)
    }
  }, [effects])

  // 대표 효과 추출 함수 (메모이제이션으로 성능 최적화)
  const getRepresentativeEffects = useMemo(() => {
    return () => {
      const representativeEffects: EffectTemplateWithMedia[] = []
      const seenCategories = new Set<number>()
      
      // display_order로 정렬된 effects에서 각 카테고리의 첫 번째 효과만 선택
      for (const effect of effects) {
        if (effect.category && !seenCategories.has(effect.category.id)) {
          seenCategories.add(effect.category.id)
          representativeEffects.push(effect)
        }
      }
      
      return representativeEffects
    }
  }, [effects])

  // React Query refetch 함수 래핑
  const refetchEffects = async () => {
    await Promise.all([
      effectsQuery.refetch(),
      categoriesQuery.refetch()
    ])
  }

  const value: EffectsDataContextType = {
    effects,
    categories,
    isLoading,
    error,
    refetchEffects,
    getEffectsByCategory,
    getRepresentativeEffects
  }

  return (
    <EffectsDataContext.Provider value={value}>
      {children}
    </EffectsDataContext.Provider>
  )
}

export function useEffectsData() {
  const context = useContext(EffectsDataContext)
  if (context === undefined) {
    throw new Error('useEffectsData must be used within an EffectsDataProvider')
  }
  return context
}