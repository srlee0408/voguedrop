'use client'

import { useEffect, useCallback, useRef, useMemo } from 'react'
import { 
  getCanvasStateSync, 
  saveCanvasStateSync, 
  clearCanvasStateSync,
  debounce,
  type CanvasStorageData 
} from '@/shared/lib/canvas-storage'
import type { EffectTemplateWithMedia } from '@/shared/types/database'
import type { SlotContent } from '../_types'

// 데이터 타입별 디바운스 시간 설정
const DEBOUNCE_TIMES = {
  image: 500,        // 이미지는 큰 데이터이므로 더 긴 디바운스
  text: 300,         // 텍스트는 빠른 응답
  selection: 200,    // 선택사항은 더 빠르게
  slot: 400,         // 슬롯 데이터는 중간 정도
} as const

/**
 * 두 객체가 깊이 동일한지 비교 (dirty flag용)
 */
function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true
  if (a == null || b == null) return false
  if (typeof a !== 'object' || typeof b !== 'object') return false
  
  const keysA = Object.keys(a as object)
  const keysB = Object.keys(b as object)
  
  if (keysA.length !== keysB.length) return false
  
  for (const key of keysA) {
    if (!keysB.includes(key)) return false
    if (!deepEqual((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key])) return false
  }
  
  return true
}

/**
 * 데이터 타입에 따른 동적 디바운스 시간 계산
 */
function getDynamicDebounceTime(
  uploadedImage: string | null,
  slotContents: Array<SlotContent>,
  hasImageData: boolean
): number {
  // 이미지 데이터가 포함된 경우
  if (hasImageData || uploadedImage || slotContents.some(slot => slot?.type === 'image')) {
    return DEBOUNCE_TIMES.image
  }
  
  // 슬롯 데이터가 포함된 경우
  if (slotContents.some(slot => slot !== null)) {
    return DEBOUNCE_TIMES.slot
  }
  
  // 일반 텍스트/선택 데이터
  return DEBOUNCE_TIMES.text
}

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
 * - 상태 변경 시 자동 저장 (동적 디바운스)
 * - dirty flag로 불필요한 저장 방지
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
  
  // 이전 상태 추적 (dirty flag용)
  const previousDataRef = useRef<Partial<CanvasStorageData> | null>(null)
  
  // 현재 디바운스된 저장 함수 참조
  const currentSaveRef = useRef<((data: Partial<CanvasStorageData>) => void) | null>(null)
  
  // 현재 데이터를 메모이제이션
  const currentData = useMemo(() => ({
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
  }), [
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
  ])
  
  // 동적 디바운스 시간 계산
  const debounceTime = useMemo(() => {
    const hasImageData = Boolean(uploadedImage && uploadedImage.startsWith('data:image/'))
    return getDynamicDebounceTime(uploadedImage, slotContents, hasImageData)
  }, [uploadedImage, slotContents])
  
  // dirty flag 체크
  const isDirty = useMemo(() => {
    if (!previousDataRef.current) return true
    return !deepEqual(currentData, previousDataRef.current)
  }, [currentData])
  
  // 동적 디바운스된 저장 함수 생성
  const createDebouncedSave = useCallback((debounceMs: number) => {
    return debounce((data: Partial<CanvasStorageData>) => {
      // dirty flag 재체크 (디바운스 지연 동안 데이터가 바뀔 수 있음)
      if (previousDataRef.current && deepEqual(data, previousDataRef.current)) {
        return // 변경사항 없으면 저장 스킵
      }
      
      saveCanvasStateSync(data)
      previousDataRef.current = { ...data } // 저장 후 이전 상태 업데이트
    }, debounceMs)
  }, [])
  
  // 디바운스 시간이 변경될 때마다 새로운 저장 함수 생성
  useEffect(() => {
    currentSaveRef.current = createDebouncedSave(debounceTime)
  }, [debounceTime, createDebouncedSave])
  
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
  
  // 상태 변경 감지 및 자동 저장 (dirty flag + 동적 디바운스)
  useEffect(() => {
    // 초기 로드 중이거나 변경사항이 없으면 저장하지 않음
    if (!isMounted.current || !isDirty || !currentSaveRef.current) return
    
    // 동적 디바운스된 저장 함수 호출
    currentSaveRef.current(currentData)
  }, [currentData, isDirty])
  
  // 초기 상태 설정 (복원 후)
  useEffect(() => {
    if (isMounted.current && previousDataRef.current === null) {
      previousDataRef.current = { ...currentData }
    }
  }, [currentData])
  
  // 상태 초기화 함수
  const reset = useCallback(() => {
    clearCanvasStateSync()
    // 이전 상태도 초기화
    previousDataRef.current = null
    
    if (onRestore) {
      const defaultData = {
        uploadedImage: null,
        selectedEffects: [],
        promptText: '',
        negativePrompt: '',
        selectedResolution: '1:1',
        selectedSize: '1024×1024',
        selectedDuration: '6',
        slotContents: [null, null, null, null],
        slotStates: ["empty", "empty", "empty", "empty"] as Array<"empty" | "generating" | "completed">,
        slotCompletedAt: [null, null, null, null],
      }
      
      onRestore(defaultData)
      // 초기화 후 상태 업데이트
      previousDataRef.current = { ...defaultData }
    }
  }, [onRestore])
  
  return {
    reset,
    isRestored: isInitialized.current,
    isDirty, // dirty flag 상태 노출
    debounceTime, // 현재 디바운스 시간 노출 (디버깅용)
  }
}