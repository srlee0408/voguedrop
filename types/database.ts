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

export interface Creation {
  id: number
  title: string | null
  prompt: string
  category_id: number
  product_id: number
  created_at: string
}

export interface CreationWithMedia extends Creation {
  category: Category
  product: MediaAsset
}