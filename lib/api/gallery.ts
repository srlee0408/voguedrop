import { unstable_cache } from 'next/cache'
import { supabase } from '@/lib/supabase'
import type { EffectTemplateWithMedia, Category } from '@/types/database'

// 내부 구현 함수 (캐시되지 않은 원본)
async function _getGalleryItemsInternal(): Promise<EffectTemplateWithMedia[]> {
  try {
    const { data, error } = await supabase
      .from('effect_templates')
      .select(`
        *,
        category:categories!category_id(*),
        preview_media:media_assets!preview_media_id(*)
      `)
      .not('preview_media_id', 'is', null)
      .eq('is_active', true)
      .order('category_id')
      .order('display_order')

    if (error) {
      console.error('Error fetching gallery items:', error)
      throw new Error('Failed to fetch gallery items')
    }

    // Transform the data to match our interface
    const transformedData: EffectTemplateWithMedia[] = (data || []).map(item => {
      return {
        id: item.id,
        name: item.name,
        prompt: item.prompt,
        category_id: item.category_id,
        preview_media_id: item.preview_media_id,
        is_active: item.is_active,
        created_at: item.created_at,
        display_order: item.display_order,
        category: item.category,
        preview_media: item.preview_media
      }
    })

    return transformedData
  } catch (error) {
    console.error('Gallery API error:', error)
    throw error
  }
}

// 카테고리 내부 구현 함수
async function _getCategoriesInternal(): Promise<Category[]> {
  try {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('name')

    if (error) {
      console.error('Error fetching categories:', error)
      throw new Error('Failed to fetch categories')
    }

    return data || []
  } catch (error) {
    console.error('Categories API error:', error)
    throw error
  }
}

// 캐시된 버전 export - 갤러리 아이템
export const getGalleryItems = unstable_cache(
  _getGalleryItemsInternal,
  ['gallery-items'],  // 캐시 키
  {
    revalidate: 60,    // 60초 후 자동 재검증
    tags: ['gallery', 'effect-templates']  // 태그 기반 무효화용
  }
)

// 캐시된 버전 export - 카테고리
export const getCategories = unstable_cache(
  _getCategoriesInternal,
  ['categories'],
  {
    revalidate: 300,  // 5분 (카테고리는 자주 변경되지 않음)
    tags: ['categories']
  }
)