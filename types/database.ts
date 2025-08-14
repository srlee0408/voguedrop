export interface Category {
  id: number
  name: string
  created_at: string
}

export interface MediaAsset {
  id: number
  storage_path: string
  file_name: string | null
  media_type: string | null
  created_at: string
}

export interface EffectTemplate {
  id: number
  name: string
  category_id: number
  prompt: string
  preview_media_id: number | null
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