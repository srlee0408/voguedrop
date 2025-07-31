"use client"

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import type { EffectTemplateWithMedia } from '@/types/database'

interface EffectsDataContextType {
  effects: EffectTemplateWithMedia[]
  isLoading: boolean
  error: string | null
  refetchEffects: () => Promise<void>
  getEffectsByCategory: (category: string) => EffectTemplateWithMedia[]
}

const EffectsDataContext = createContext<EffectsDataContextType | undefined>(undefined)

export function EffectsDataProvider({ children }: { children: ReactNode }) {
  const [effects, setEffects] = useState<EffectTemplateWithMedia[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchEffects = async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      const response = await fetch('/api/canvas/effects?category=all')
      
      if (!response.ok) {
        throw new Error('Failed to fetch effects')
      }
      
      const data = await response.json()
      setEffects(data.effects || [])
    } catch (err) {
      console.error('Error fetching effects:', err)
      setError('Failed to load effects')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchEffects()
  }, [])

  const getEffectsByCategory = (category: string) => {
    if (category === 'all' || category === 'All') {
      return effects
    }
    
    const categoryMap: { [key: string]: string } = {
      'Effect': 'effect',
      'Camera': 'camera',
      'Model': 'model',
      'effect': 'effect',
      'camera': 'camera',
      'model': 'model'
    }
    
    const normalizedCategory = categoryMap[category] || category
    return effects.filter(effect => effect.category?.name === normalizedCategory)
  }

  const value: EffectsDataContextType = {
    effects,
    isLoading,
    error,
    refetchEffects: fetchEffects,
    getEffectsByCategory
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