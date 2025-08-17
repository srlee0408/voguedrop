'use client'

import { useState, useCallback } from 'react'
import type { EffectTemplateWithMedia } from '@/types/database'
import type { EffectsManagerReturn } from '../_types'

const MAX_EFFECTS = 2

/**
 * 효과 선택 및 관리를 담당하는 훅
 * 최대 2개까지 효과 선택 가능
 */
export function useEffectsManager(): EffectsManagerReturn {
  const [selectedEffects, setSelectedEffects] = useState<EffectTemplateWithMedia[]>([])

  const canAddMore = selectedEffects.length < MAX_EFFECTS

  const addEffect = useCallback((effect: EffectTemplateWithMedia): void => {
    setSelectedEffects((prev) => {
      // 이미 선택된 효과인지 확인
      if (prev.some((e) => e.id === effect.id)) {
        return prev
      }
      
      // 최대 개수 초과 시 첫 번째 효과를 제거하고 추가
      if (prev.length >= MAX_EFFECTS) {
        return [...prev.slice(1), effect]
      }
      
      return [...prev, effect]
    })
  }, [])

  const removeEffect = useCallback((effectId: number): void => {
    setSelectedEffects((prev) => prev.filter((e) => e.id !== effectId))
  }, [])

  const toggleEffect = useCallback((effect: EffectTemplateWithMedia): void => {
    setSelectedEffects((prev) => {
      const isSelected = prev.some((e) => e.id === effect.id)
      
      if (isSelected) {
        // 선택 해제
        return prev.filter((e) => e.id !== effect.id)
      } else {
        // 선택 추가
        if (prev.length >= MAX_EFFECTS) {
          // 첫 번째 요소를 제거하고 새로운 것을 추가
          return [...prev.slice(1), effect]
        }
        return [...prev, effect]
      }
    })
  }, [])

  const clearEffects = useCallback((): void => {
    setSelectedEffects([])
  }, [])

  return {
    selectedEffects,
    canAddMore,
    addEffect,
    removeEffect,
    toggleEffect,
    clearEffects,
    maxEffects: MAX_EFFECTS,
  }
}