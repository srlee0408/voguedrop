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
}