'use client'

import React, { createContext, useContext, useState, useCallback } from 'react'
import type { GeneratedVideo } from '@/types/canvas'
import type { CanvasContextValue } from '../_types'
import { useModalManager } from '../_hooks/useModalManager'
import { useFavoritesManager } from '../_hooks/useFavoritesManager'
import { useEffectsManager } from '../_hooks/useEffectsManager'
import { useCanvasSettings } from '../_hooks/useCanvasSettings'
import { useSlotManager } from '../_hooks/useSlotManager'
import { useVideoGeneration } from '../_hooks/useVideoGeneration'
import { CanvasAPI } from '../_services/api'

const CanvasContext = createContext<CanvasContextValue | undefined>(undefined)

export function useCanvas(): CanvasContextValue {
  const context = useContext(CanvasContext)
  if (!context) {
    throw new Error('useCanvas must be used within CanvasProvider')
  }
  return context
}

interface CanvasProviderProps {
  children: React.ReactNode
}

/**
 * Canvas 페이지의 모든 상태와 로직을 통합 관리하는 Provider
 * Props drilling을 완전히 제거하고 관심사를 분리
 */
export function CanvasProvider({ children }: CanvasProviderProps): React.ReactElement {
  
  // 각 도메인별 훅 사용
  const modals = useModalManager()
  const favorites = useFavoritesManager()
  const effects = useEffectsManager()
  const settings = useCanvasSettings()
  const slotManager = useSlotManager()
  
  // 로컬 상태
  const [currentGeneratingImage, setCurrentGeneratingImage] = useState<string | null>(null)
  const [selectedVideoId, setSelectedVideoId] = useState<string | null>(null)
  const [isDownloading, setIsDownloading] = useState<boolean>(false)
  
  // 비디오 생성 훅 (의존성 주입)
  const videoGeneration = useVideoGeneration({
    getCurrentImage: () => currentGeneratingImage,
    selectedEffects: effects.selectedEffects,
    promptText: settings.promptText,
    selectedDuration: settings.selectedDuration,
    slotManager: {
      slotStates: slotManager.slotStates,
      findAvailableSlotForGeneration: slotManager.findAvailableSlotForGeneration,
      setSlotToImage: slotManager.setSlotToImage,
      markSlotGenerating: slotManager.markSlotGenerating,
      placeVideoInSlot: slotManager.placeVideoInSlot,
      resetSlot: slotManager.resetSlot,
    },
    onVideoCompleted: (video: GeneratedVideo) => {
      if (!selectedVideoId) {
        setSelectedVideoId(video.id)
      }
    },
  })

  // 다운로드 핸들러
  const handleDownload = useCallback(async (): Promise<void> => {
    if (!slotManager.activeVideo || !slotManager.activeVideo.url) {
      return
    }

    if (isDownloading) {
      return
    }

    setIsDownloading(true)

    try {
      const effectName = effects.selectedEffects[0]?.name
      await CanvasAPI.downloadAndSaveVideo(slotManager.activeVideo, effectName)
    } catch (error) {
      console.error('Download failed:', error)
      videoGeneration.setGenerationError('다운로드에 실패했습니다. 다시 시도해주세요.')
    } finally {
      setIsDownloading(false)
    }
  }, [slotManager.activeVideo, isDownloading, effects.selectedEffects, videoGeneration])

  const contextValue: CanvasContextValue = {
    modals,
    settings,
    favorites,
    effects,
    currentGeneratingImage,
    setCurrentGeneratingImage,
    selectedVideoId,
    setSelectedVideoId,
    isDownloading,
    handleDownload,
  }

  return <CanvasContext.Provider value={contextValue}>{children}</CanvasContext.Provider>
}

// 개별 훅들을 export하여 필요한 곳에서 직접 사용 가능
export { useSlotManager } from '../_hooks/useSlotManager'
export { useVideoGeneration } from '../_hooks/useVideoGeneration'