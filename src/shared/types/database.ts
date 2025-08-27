/**
 * Database Types - Supabase 데이터베이스 테이블 타입 정의
 * 
 * 주요 역할:
 * 1. Supabase 데이터베이스 스키마에 대응하는 TypeScript 타입 제공
 * 2. API 응답 및 데이터 조작 시 타입 안전성 보장
 * 3. 테이블 간 관계(JOIN) 결과에 대한 확장 타입 지원
 * 4. 프론트엔드와 백엔드 간 데이터 구조 일관성 유지
 * 
 * 핵심 특징:
 * - 데이터베이스 스키마와 1:1 대응하는 기본 인터페이스
 * - 관계형 데이터를 위한 확장 타입 (WithMedia, WithCategory 등)
 * - 선택적 필드(optional)와 null 허용 필드 구분
 * - created_at 등 공통 필드의 일관된 타입 정의
 * 
 * 주의사항:
 * - 데이터베이스 스키마 변경 시 타입 동기화 필수
 * - null 허용 필드는 런타임 null 체크 필요
 * - JOIN 쿼리 결과는 확장 타입 사용 권장
 */
export interface Category {
  id: string
  name: string
  created_at: string
}

export interface MediaAsset {
  id: string
  storage_path: string
  file_name: string | null
  media_type: string | null
  created_at: string
}

export interface EffectTemplate {
  id: string
  name: string
  category_id: string
  prompt: string
  preview_media_id: string | null
  display_order: number
  is_active: boolean
  created_at: string
}

export interface EffectTemplateWithMedia extends EffectTemplate {
  category: Category
  preview_media: MediaAsset | null
  previewUrl?: string
}

export interface ProjectSave {
  id: string
  user_id: string
  project_name: string
  latest_render_id: string | null
  content_snapshot: {
    version: string
    aspect_ratio: '9:16' | '1:1' | '16:9'
    duration_frames: number
    video_clips: unknown[]
    text_clips: unknown[]
    sound_clips: unknown[]
    content_hash: string
    video_url?: string
  }
  content_hash: string
  version: number
  is_latest: boolean
  created_at: string
  updated_at: string
}

export interface VideoRender {
  id: string
  user_id: string
  project_name: string
  render_id: string
  status: 'processing' | 'completed' | 'failed'
  aspect_ratio: '9:16' | '1:1' | '16:9'
  duration_frames: number
  output_url: string | null
  thumbnail_url: string | null
  video_clips: unknown
  text_clips: unknown
  sound_clips: unknown
  content_hash: string | null
  project_save_id: string | null
  created_at: string
  completed_at: string | null
}

export interface UserUploadedVideo {
  id: string
  user_id: string
  file_name: string
  storage_path: string
  file_size: number
  duration?: number
  aspect_ratio?: string
  thumbnail_url?: string
  metadata?: Record<string, unknown>
  uploaded_at: string
  is_deleted?: boolean
}