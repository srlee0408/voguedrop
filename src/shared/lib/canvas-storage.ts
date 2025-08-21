import type { EffectTemplateWithMedia } from '@/shared/types/database'
import type { GeneratedVideo } from '@/shared/types/canvas'

export const CANVAS_STORAGE_KEY = 'voguedrop_canvas_state'
export const CANVAS_STORAGE_VERSION = '1.1.0' // 버전 업그레이드 (압축 기능 추가)
export const CANVAS_STORAGE_MAX_AGE = 30 * 24 * 60 * 60 * 1000 // 30일
export const MAX_IMAGE_SIZE = 1.5 * 1024 * 1024 // 1.5MB 제한 (기존 2MB에서 축소)
export const COMPRESSION_QUALITY = 0.8 // JPEG 압축 품질

// IndexedDB 설정
const IDB_NAME = 'voguedrop_storage'
const IDB_VERSION = 1
const IDB_STORE_NAME = 'canvas_state'

/**
 * 이미지를 압축하여 크기를 줄입니다
 */
function compressImage(imageDataUrl: string, quality: number = COMPRESSION_QUALITY): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!imageDataUrl.startsWith('data:image/')) {
      resolve(imageDataUrl) // 이미지가 아니면 그대로 반환
      return
    }

    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    const img = new Image()

    img.onload = () => {
      // 최대 크기 제한 (1920x1080)
      const maxWidth = 1920
      const maxHeight = 1080
      let { width, height } = img

      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height)
        width *= ratio
        height *= ratio
      }

      canvas.width = width
      canvas.height = height

      if (ctx) {
        ctx.drawImage(img, 0, 0, width, height)
        
        // JPEG로 압축 (PNG보다 크기가 작음)
        const compressedDataUrl = canvas.toDataURL('image/jpeg', quality)
        resolve(compressedDataUrl)
      } else {
        reject(new Error('Canvas context not available'))
      }
    }

    img.onerror = () => reject(new Error('Failed to load image'))
    img.src = imageDataUrl
  })
}

/**
 * IndexedDB 연결을 가져옵니다
 */
function getIndexedDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(IDB_NAME, IDB_VERSION)
    
    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)
    
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result
      if (!db.objectStoreNames.contains(IDB_STORE_NAME)) {
        db.createObjectStore(IDB_STORE_NAME)
      }
    }
  })
}

/**
 * IndexedDB에서 데이터를 가져옵니다
 */
async function getFromIndexedDB(key: string): Promise<CanvasStorageData | null> {
  try {
    const db = await getIndexedDB()
    const transaction = db.transaction([IDB_STORE_NAME], 'readonly')
    const store = transaction.objectStore(IDB_STORE_NAME)
    
    return new Promise((resolve, reject) => {
      const request = store.get(key)
      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve(request.result || null)
    })
  } catch (error) {
    console.error('IndexedDB get error:', error)
    return null
  }
}

/**
 * IndexedDB에 데이터를 저장합니다
 */
async function saveToIndexedDB(key: string, data: CanvasStorageData): Promise<boolean> {
  try {
    const db = await getIndexedDB()
    const transaction = db.transaction([IDB_STORE_NAME], 'readwrite')
    const store = transaction.objectStore(IDB_STORE_NAME)
    
    return new Promise((resolve, reject) => {
      const request = store.put(data, key)
      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve(true)
    })
  } catch (error) {
    console.error('IndexedDB save error:', error)
    return false
  }
}

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
 * Canvas 상태를 가져옵니다 (localStorage 우선, IndexedDB fallback)
 */
export async function getCanvasState(): Promise<CanvasStorageData | null> {
  if (typeof window === 'undefined') return null
  
  // 1. localStorage에서 먼저 시도
  try {
    const stored = localStorage.getItem(CANVAS_STORAGE_KEY)
    if (stored) {
      const data = JSON.parse(stored) as CanvasStorageData
      
      // 버전 체크
      if (data.version === CANVAS_STORAGE_VERSION) {
        // 만료 시간 체크 (30일)
        const now = Date.now()
        if (now - data.timestamp <= CANVAS_STORAGE_MAX_AGE) {
          return data
        }
      }
      
      // 버전 불일치 또는 만료된 경우 제거
      localStorage.removeItem(CANVAS_STORAGE_KEY)
    }
  } catch (error) {
    console.error('Failed to load canvas state from localStorage:', error)
  }
  
  // 2. IndexedDB에서 fallback 시도
  try {
    const data = await getFromIndexedDB(CANVAS_STORAGE_KEY)
    if (data) {
      // 버전 체크
      if (data.version === CANVAS_STORAGE_VERSION) {
        // 만료 시간 체크 (30일)
        const now = Date.now()
        if (now - data.timestamp <= CANVAS_STORAGE_MAX_AGE) {
          // localStorage에 다시 캐싱 시도
          try {
            localStorage.setItem(CANVAS_STORAGE_KEY, JSON.stringify(data))
          } catch {
            // localStorage 실패는 무시 (IndexedDB 데이터는 유효)
          }
          return data
        }
      }
    }
  } catch (error) {
    console.error('Failed to load canvas state from IndexedDB:', error)
  }
  
  return null
}

/**
 * 동기 버전의 getCanvasState (기존 호환성을 위해 유지)
 */
export function getCanvasStateSync(): CanvasStorageData | null {
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
 * Canvas 상태를 저장합니다 (이미지 압축 및 IndexedDB fallback 포함)
 */
export async function saveCanvasState(data: Partial<CanvasStorageData>): Promise<void> {
  if (typeof window === 'undefined') return
  
  try {
    const currentData = await getCanvasState()
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
    
    // 이미지 압축 및 크기 최적화
    if (newData.uploadedImage && newData.uploadedImage.startsWith('data:image/')) {
      try {
        const compressed = await compressImage(newData.uploadedImage)
        if (compressed.length <= MAX_IMAGE_SIZE) {
          newData.uploadedImage = compressed
        } else {
          console.warn('Image still too large after compression, skipping image save')
          newData.uploadedImage = null
        }
      } catch (compressionError) {
        console.warn('Image compression failed:', compressionError)
        if (newData.uploadedImage && newData.uploadedImage.length > MAX_IMAGE_SIZE) {
          newData.uploadedImage = null
        }
      }
    }
    
    // 슬롯 내 이미지 데이터 압축
    const compressedSlotContents = await Promise.all(
      newData.slotContents.map(async (slot) => {
        if (slot?.type === 'image' && typeof slot.data === 'string' && slot.data.startsWith('data:image/')) {
          try {
            const compressed = await compressImage(slot.data)
            if (compressed.length <= MAX_IMAGE_SIZE) {
              return { ...slot, data: compressed }
            } else {
              console.warn('Slot image still too large after compression, removing from storage')
              return null
            }
          } catch (compressionError) {
            console.warn('Slot image compression failed:', compressionError)
            if (slot.data.length > MAX_IMAGE_SIZE) {
              return null
            }
          }
        }
        return slot
      })
    )
    
    newData.slotContents = compressedSlotContents
    
    // 1. localStorage 저장 시도
    try {
      localStorage.setItem(CANVAS_STORAGE_KEY, JSON.stringify(newData))
    } catch (localStorageError) {
      console.warn('localStorage save failed, trying IndexedDB:', localStorageError)
      
      // 2. IndexedDB fallback
      const saved = await saveToIndexedDB(CANVAS_STORAGE_KEY, newData)
      if (!saved) {
        throw new Error('Both localStorage and IndexedDB failed')
      }
    }
  } catch (error) {
    if (error instanceof Error && error.name === 'QuotaExceededError') {
      console.error('Storage quota exceeded, clearing old data')
      await clearCanvasState()
    } else {
      console.error('Failed to save canvas state:', error)
    }
  }
}

/**
 * 동기 버전의 saveCanvasState (기존 호환성을 위해 유지)
 */
export function saveCanvasStateSync(data: Partial<CanvasStorageData>): void {
  if (typeof window === 'undefined') return
  
  try {
    const currentData = getCanvasStateSync()
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
    
    // 이미지 데이터 크기 체크 (압축 없이)
    if (newData.uploadedImage && newData.uploadedImage.length > MAX_IMAGE_SIZE) {
      console.warn('Image data too large for localStorage, skipping image save')
      newData.uploadedImage = null
    }
    
    // 슬롯 내 이미지 데이터도 크기 체크
    newData.slotContents = newData.slotContents.map(slot => {
      if (slot?.type === 'image' && typeof slot.data === 'string') {
        if (slot.data.length > MAX_IMAGE_SIZE) {
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
 * Canvas 상태를 모든 저장소에서 삭제합니다
 */
export async function clearCanvasState(): Promise<void> {
  if (typeof window === 'undefined') return
  
  // localStorage 정리
  localStorage.removeItem(CANVAS_STORAGE_KEY)
  
  // IndexedDB 정리
  try {
    const db = await getIndexedDB()
    const transaction = db.transaction([IDB_STORE_NAME], 'readwrite')
    const store = transaction.objectStore(IDB_STORE_NAME)
    await new Promise<void>((resolve, reject) => {
      const request = store.delete(CANVAS_STORAGE_KEY)
      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve()
    })
  } catch (error) {
    console.warn('Failed to clear IndexedDB:', error)
  }
}

/**
 * 동기 버전의 clearCanvasState (기존 호환성을 위해 유지)
 */
export function clearCanvasStateSync(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(CANVAS_STORAGE_KEY)
}

/**
 * 부분적으로 Canvas 상태를 업데이트합니다
 */
export async function updateCanvasState(updates: Partial<CanvasStorageData>): Promise<void> {
  const current = await getCanvasState()
  await saveCanvasState({
    ...current,
    ...updates,
  })
}

/**
 * 동기 버전의 updateCanvasState (기존 호환성을 위해 유지)
 */
export function updateCanvasStateSync(updates: Partial<CanvasStorageData>): void {
  const current = getCanvasStateSync()
  saveCanvasStateSync({
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