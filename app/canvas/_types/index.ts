// Canvas 페이지 전용 타입 정의
import type { GeneratedVideo } from '@/types/canvas'
import type { EffectTemplateWithMedia } from '@/types/database'

// 모달 관련 타입
export type ModalName = 'library' | 'effect' | 'prompt' | 'camera' | 'model' | 'projectTitle'

export interface ModalState {
  library: boolean
  effect: boolean
  prompt: boolean
  camera: boolean
  model: boolean
  projectTitle: boolean
}

export interface ModalManagerReturn {
  modals: ModalState
  toggleModal: (modalName: ModalName) => void
  openModal: (modalName: ModalName) => void
  closeModal: (modalName: ModalName) => void
  closeAllModals: () => void
}

// Canvas 설정 타입
export interface CanvasSettings {
  promptText: string
  negativePrompt: string
  selectedResolution: string
  selectedSize: string
  selectedModelId: string
  selectedDuration: string
  isPrompterOpen: boolean
}

export interface CanvasSettingsReturn extends CanvasSettings {
  updateSettings: (settings: Partial<CanvasSettings>) => void
  resetSettings: () => void
}

// 즐겨찾기 관련 타입
export interface FavoritesManagerReturn {
  favoriteIds: Set<string>
  isLoading: boolean
  error: string | null
  toggleFavorite: (videoId: string) => Promise<void>
  isFavorite: (videoId: string) => boolean
  refreshFavorites: () => Promise<void>
}

// 효과 관리 타입
export interface EffectsManagerReturn {
  selectedEffects: EffectTemplateWithMedia[]
  canAddMore: boolean
  addEffect: (effect: EffectTemplateWithMedia) => void
  removeEffect: (effectId: number) => void
  toggleEffect: (effect: EffectTemplateWithMedia) => void
  clearEffects: () => void
  maxEffects: number
}

// Canvas Context 타입
export interface CanvasContextValue {
  // 모달 관리
  modals: ModalManagerReturn
  
  // 설정 관리
  settings: CanvasSettingsReturn
  
  // 즐겨찾기 관리
  favorites: FavoritesManagerReturn
  
  // 효과 관리
  effects: EffectsManagerReturn
  
  // 현재 생성 이미지
  currentGeneratingImage: string | null
  setCurrentGeneratingImage: (imageUrl: string | null) => void
  
  // 선택된 비디오
  selectedVideoId: string | null
  setSelectedVideoId: (videoId: string | null) => void
  
  // 다운로드 상태
  isDownloading: boolean
  handleDownload: () => Promise<void>
}

// API 응답 타입
export interface FavoritesApiResponse {
  favoriteIds?: string[]
  error?: string
}

export interface ToggleFavoriteRequest {
  videoId: string
  isFavorite: boolean
}

export interface ToggleFavoriteResponse {
  success: boolean
  error?: string
}

// 이벤트 핸들러 타입
export type ImageUploadHandler = (imageUrl: string) => void
export type VideoSelectHandler = (video: GeneratedVideo) => void
export type EffectSelectHandler = (effect: EffectTemplateWithMedia) => void
export type SlotSelectHandler = (index: number) => void
export type ContentRemoveHandler = (index: number, type: 'image' | 'video') => void

// Props 타입 정의 (컴포넌트별)
// Context를 사용하므로 props가 필요없지만, 추후 확장을 위해 타입은 유지