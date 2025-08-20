import type { EffectTemplateWithMedia } from '@/shared/types/database'
import type { GeneratedVideo } from '@/shared/types/canvas'

export const CANVAS_STORAGE_KEY = 'voguedrop_canvas_state'
export const CANVAS_STORAGE_VERSION = '1.0.0'
export const CANVAS_STORAGE_MAX_AGE = 30 * 24 * 60 * 60 * 1000 // 30일

type SlotContent = { type: "image" | "video"; data: string | GeneratedVideo } | null

export interface CanvasStorageData {
  version: string
  timestamp: number
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
}

/**
 * localStorage에서 Canvas 상태를 가져옵니다
 */
export function getCanvasState(): CanvasStorageData | null {
  if (typeof window === 'undefined') return null
  
  try {
    const stored = localStorage.getItem(CANVAS_STORAGE_KEY)
    if (!stored) return null
    
    const data = JSON.parse(stored) as CanvasStorageData
    
    // 버전 체크
    if (data.version !== CANVAS_STORAGE_VERSION) {
      localStorage.removeItem(CANVAS_STORAGE_KEY)
      return null
    }
    
    // 만료 시간 체크 (30일)
    const now = Date.now()
    if (now - data.timestamp > CANVAS_STORAGE_MAX_AGE) {
      localStorage.removeItem(CANVAS_STORAGE_KEY)
      return null
    }
    
    return data
  } catch (error) {
    console.error('Failed to load canvas state from localStorage:', error)
    return null
  }
}

/**
 * Canvas 상태를 localStorage에 저장합니다
 */
export function saveCanvasState(data: Partial<CanvasStorageData>): void {
  if (typeof window === 'undefined') return
  
  try {
    const currentData = getCanvasState()
    const newData: CanvasStorageData = {
      version: CANVAS_STORAGE_VERSION,
      timestamp: Date.now(),
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
      ...currentData,
      ...data,
    }
    
    // 이미지 데이터 크기 최적화
    // base64 이미지가 너무 크면 저장하지 않음 (2MB 제한)
    if (newData.uploadedImage && newData.uploadedImage.length > 2 * 1024 * 1024) {
      console.warn('Image data too large for localStorage, skipping image save')
      newData.uploadedImage = null
    }
    
    // 슬롯 내 이미지 데이터도 크기 체크
    newData.slotContents = newData.slotContents.map(slot => {
      if (slot?.type === 'image' && typeof slot.data === 'string') {
        if (slot.data.length > 2 * 1024 * 1024) {
          console.warn('Slot image data too large, removing from storage')
          return null
        }
      }
      return slot
    })
    
    localStorage.setItem(CANVAS_STORAGE_KEY, JSON.stringify(newData))
  } catch (error) {
    if (error instanceof Error && error.name === 'QuotaExceededError') {
      console.error('localStorage quota exceeded, clearing old data')
      clearCanvasState()
    } else {
      console.error('Failed to save canvas state to localStorage:', error)
    }
  }
}

/**
 * localStorage에서 Canvas 상태를 삭제합니다
 */
export function clearCanvasState(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(CANVAS_STORAGE_KEY)
}

/**
 * 부분적으로 Canvas 상태를 업데이트합니다
 */
export function updateCanvasState(updates: Partial<CanvasStorageData>): void {
  const current = getCanvasState()
  saveCanvasState({
    ...current,
    ...updates,
  })
}

/**
 * 디바운스 헬퍼 함수
 */
export function debounce<Args extends unknown[]>(
  func: (...args: Args) => void,
  wait: number
): (...args: Args) => void {
  let timeout: NodeJS.Timeout | null = null
  
  return (...args: Args) => {
    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
}