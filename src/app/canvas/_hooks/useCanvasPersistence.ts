'use client'

import { useEffect, useCallback, useRef } from 'react'
import { 
  getCanvasStateSync, 
  saveCanvasStateSync, 
  clearCanvasStateSync,
  debounce,
  type CanvasStorageData 
} from '@/shared/lib/canvas-storage'
import type { EffectTemplateWithMedia } from '@/shared/types/database'
import type { GeneratedVideo } from '@/shared/types/canvas'

type SlotContent = { type: "image" | "video"; data: string | GeneratedVideo } | null

interface UseCanvasPersistenceProps {
  uploadedImage: string | null
  selectedEffects: EffectTemplateWithMedia[]
  promptText: string
  negativePrompt: string
  selectedResolution: string
  selectedSize: string
  selectedDuration: string
  slotContents: Array<SlotContent>
  slotStates: Array<"empty" | "generating" | "completed">
  slotCompletedAt: Array<number | null>
  onRestore?: (data: Partial<CanvasStorageData>) => void
}

/**
 * Canvas 상태를 localStorage와 동기화하는 훅
 * - 컴포넌트 마운트 시 저장된 상태 복원
 * - 상태 변경 시 자동 저장 (300ms 디바운스)
 * - 새로고침해도 상태 유지
 */
export function useCanvasPersistence({
  uploadedImage,
  selectedEffects,
  promptText,
  negativePrompt,
  selectedResolution,
  selectedSize,
  selectedDuration,
  slotContents,
  slotStates,
  slotCompletedAt,
  onRestore,
}: UseCanvasPersistenceProps) {
  const isInitialized = useRef(false)
  const isMounted = useRef(false)
  
  // 디바운스된 저장 함수
  const debouncedSave = useRef(
    debounce((data: Partial<CanvasStorageData>) => {
      saveCanvasStateSync(data)
    }, 300)
  ).current
  
  // 초기 복원 (컴포넌트 마운트 시 한 번만)
  useEffect(() => {
    if (!isInitialized.current) {
      isInitialized.current = true
      const savedState = getCanvasStateSync()
      
      if (savedState && onRestore) {
        // generating 상태인 슬롯들을 empty로 리셋 (새로고침 시 진행 중이던 작업은 취소)
        const resetSlotStates = savedState.slotStates.map(state => 
          state === 'generating' ? 'empty' as const : state
        )
        
        onRestore({
          ...savedState,
          slotStates: resetSlotStates,
        })
      }
      
      isMounted.current = true
    }
  }, [onRestore])
  
  // 상태 변경 감지 및 자동 저장
  useEffect(() => {
    // 초기 로드 중에는 저장하지 않음
    if (!isMounted.current) return
    
    debouncedSave({
      uploadedImage,
      selectedEffects,
      promptText,
      negativePrompt,
      selectedResolution,
      selectedSize,
      selectedDuration,
      slotContents,
      slotStates,
      slotCompletedAt,
    })
  }, [
    uploadedImage,
    selectedEffects,
    promptText,
    negativePrompt,
    selectedResolution,
    selectedSize,
    selectedDuration,
    slotContents,
    slotStates,
    slotCompletedAt,
    debouncedSave,
  ])
  
  // 상태 초기화 함수
  const reset = useCallback(() => {
    clearCanvasStateSync()
    if (onRestore) {
      onRestore({
        uploadedImage: null,
        selectedEffects: [],
        promptText: '',
        negativePrompt: '',
        selectedResolution: '1:1',
        selectedSize: '1024×1024',
        selectedDuration: '6',
        slotContents: [null, null, null, null],
        slotStates: ["empty", "empty", "empty", "empty"],
        slotCompletedAt: [null, null, null, null],
      })
    }
  }, [onRestore])
  
  return {
    reset,
    isRestored: isInitialized.current,
  }
}