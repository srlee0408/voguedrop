// Canvas 페이지 전용 타입 정의
import type { GeneratedVideo } from '@/shared/types/canvas'
import type { EffectTemplateWithMedia } from '@/shared/types/database'

// 모달 관련 타입
export type ModalName = 'library' | 'effect' | 'prompt' | 'camera' | 'model' | 'projectTitle' | 'imageBrush'

export interface ModalState {
  library: boolean
  effect: boolean
  prompt: boolean
  camera: boolean
  model: boolean
  projectTitle: boolean
  imageBrush: boolean
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
  restoreEffects: (effects: EffectTemplateWithMedia[]) => void
  maxEffects: number
}

// 슬롯 관리 타입
export type SlotContent = { type: 'image' | 'video'; data: string | GeneratedVideo } | null
export type SlotState = 'empty' | 'generating' | 'completed'

export interface SlotManagerReturn {
  // 상태
  slotContents: Array<SlotContent>
  slotStates: Array<SlotState>
  slotCompletedAt: Array<number | null>
  selectedSlotIndex: number | null
  activeVideo: GeneratedVideo | null

  // 선택 제어
  setSelectedSlotIndex: (index: number | null) => void
  setActiveVideo: (video: GeneratedVideo | null) => void
  handleSlotSelect: (index: number, video: GeneratedVideo | null) => void

  // 이미지/비디오 배치
  handleImageUpload: (imageUrl: string, isSlotGenerating: (slotIndex: number) => boolean, prevImage?: string | null) => void
  removeImageByUrlIfEmpty: (imageUrl: string) => void
  handleVideoToggle: (video: GeneratedVideo, isSlotGenerating: (slotIndex: number) => boolean) => boolean
  handleRemoveContent: (index: number) => void

  // 생성 플로우 인터페이스
  findAvailableSlotForGeneration: (imageUrl: string | null) => number
  setSlotToImage: (slotIndex: number, imageUrl: string) => void
  markSlotGenerating: (slotIndex: number) => void
  placeVideoInSlot: (slotIndex: number, video: GeneratedVideo) => void
  markSlotCompleted: (slotIndex: number) => void
  resetSlot: (slotIndex: number) => void
  updateVideoFavoriteFlag: (videoId: string, isFavorite: boolean) => void
  
  // 복원
  restoreSlotStates: (state: {
    slotContents?: Array<SlotContent>
    slotStates?: Array<SlotState>
    slotCompletedAt?: Array<number | null>
  }) => void
  
  // WeakMap 메타데이터 관리 (디버깅/모니터링용)
  getVideoMetadata: (video: GeneratedVideo) => { slotIndex: number; timestamp: number } | null
  trackVideoMetadata: (video: GeneratedVideo, slotIndex: number) => void
  
  // 자동 정리 제어 (필요 시 수동 제어)
  scheduleSlotCleanup: (slotIndex: number) => void
  cancelSlotCleanup: (slotIndex: number) => void
}

// 비디오 생성 관리 타입  
export interface VideoGenerationReturn {
  isGenerating: boolean
  canGenerate: boolean
  generatingProgress: Map<string, number>
  generatingJobIds: Map<string, string>
  generationError: string | null
  generateVideo: () => Promise<void>
  isSlotGenerating: (slotIndex: number) => boolean
  setGenerationError: (error: string | null) => void
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
  
  // 슬롯 관리
  slotManager: SlotManagerReturn
  
  // 비디오 생성 관리
  videoGeneration: VideoGenerationReturn
  
  // 현재 생성 이미지
  currentGeneratingImage: string | null
  setCurrentGeneratingImage: (imageUrl: string | null) => void
  
  // 현재 편집 중인 슬롯 인덱스
  currentEditingSlotIndex: number | null
  setCurrentEditingSlotIndex: (index: number | null) => void
  
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