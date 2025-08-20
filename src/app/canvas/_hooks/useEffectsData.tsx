"use client"

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
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

const EffectsDataContext = createContext<EffectsDataContextType | undefined>(undefined)

export function EffectsDataProvider({ children }: { children: ReactNode }) {
  const [effects, setEffects] = useState<EffectTemplateWithMedia[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      // 병렬로 effects와 categories 로드
      const [effectsResponse, categoriesResponse] = await Promise.all([
        fetch('/api/canvas/effects?category=all'),
        fetch('/api/canvas/categories')
      ])
      
      if (!effectsResponse.ok || !categoriesResponse.ok) {
        throw new Error('Failed to fetch data')
      }
      
      const [effectsData, categoriesData] = await Promise.all([
        effectsResponse.json(),
        categoriesResponse.json()
      ])
      
      setEffects(effectsData.effects || [])
      setCategories(categoriesData.categories || [])
    } catch (err) {
      console.error('Error fetching data:', err)
      setError('Failed to load data')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const getEffectsByCategory = (category: string) => {
    if (category === 'all' || category === 'All') {
      return effects
    }
    
    // 카테고리 이름을 소문자로 정규화
    const normalizedCategory = category.toLowerCase()
    return effects.filter(effect => effect.category?.name === normalizedCategory)
  }

  const getRepresentativeEffects = () => {
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

  const value: EffectsDataContextType = {
    effects,
    categories,
    isLoading,
    error,
    refetchEffects: fetchData,
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