'use client'

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react'
import type { GeneratedVideo } from '@/shared/types/canvas'
import type { CanvasContextValue } from '../_types'
import { useModalManager } from '../_hooks/useModalManager'
import { useFavoritesManager } from '../_hooks/useFavoritesManager'
import { useEffectsManager } from '../_hooks/useEffectsManager'
import { useCanvasSettings } from '../_hooks/useCanvasSettings'
import { useSlotManager } from '../_hooks/useSlotManager'
import { useVideoGeneration } from '../_hooks/useVideoGeneration'
import { useCanvasPersistence } from '../_hooks/useCanvasPersistence'
import { CanvasAPI } from '../_services/api'
import { getCanvasState } from '@/shared/lib/canvas-storage'

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
 * localStorage를 통한 상태 지속성 지원
 */
export function CanvasProvider({ children }: CanvasProviderProps): React.ReactElement {
  // 각 도메인별 훅 사용 (초기에는 기본값으로 시작)
  const modals = useModalManager()
  const favorites = useFavoritesManager()
  const effects = useEffectsManager()
  const settings = useCanvasSettings()
  const slotManager = useSlotManager()
  
  // 로컬 상태
  const [currentGeneratingImage, setCurrentGeneratingImage] = useState<string | null>(null)
  const [currentEditingSlotIndex, setCurrentEditingSlotIndex] = useState<number | null>(null)
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

  // 클라이언트 사이드에서만 localStorage 복원
  useEffect(() => {
    const savedState = getCanvasState()
    if (savedState) {
      // 효과 복원
      if (savedState.selectedEffects?.length > 0) {
        effects.restoreEffects(savedState.selectedEffects)
      }
      
      // 설정 복원
      settings.updateSettings({
        promptText: savedState.promptText,
        negativePrompt: savedState.negativePrompt,
        selectedResolution: savedState.selectedResolution,
        selectedSize: savedState.selectedSize,
        selectedDuration: savedState.selectedDuration,
      })
      
      // 슬롯 상태 복원 (generating 상태는 empty로 리셋)
      const resetSlotStates = savedState.slotStates.map(state => 
        state === 'generating' ? 'empty' as const : state
      )
      slotManager.restoreSlotStates({
        slotContents: savedState.slotContents,
        slotStates: resetSlotStates,
        slotCompletedAt: savedState.slotCompletedAt,
      })
      
      // 업로드된 이미지 복원
      if (savedState.uploadedImage) {
        setCurrentGeneratingImage(savedState.uploadedImage)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // 마운트 시 한 번만 실행
  
  // Canvas persistence 훅 사용 (상태 변경 시 자동 저장)
  useCanvasPersistence({
    uploadedImage: currentGeneratingImage,
    selectedEffects: effects.selectedEffects,
    promptText: settings.promptText,
    negativePrompt: settings.negativePrompt,
    selectedResolution: settings.selectedResolution,
    selectedSize: settings.selectedSize,
    selectedDuration: settings.selectedDuration,
    slotContents: slotManager.slotContents,
    slotStates: slotManager.slotStates,
    slotCompletedAt: slotManager.slotCompletedAt,
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
    slotManager,
    videoGeneration,
    currentGeneratingImage,
    setCurrentGeneratingImage,
    currentEditingSlotIndex,
    setCurrentEditingSlotIndex,
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