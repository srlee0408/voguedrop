import { supabase } from '@/lib/supabase'
import type { EffectTemplateWithMedia, Category } from '@/types/database'

export async function getGalleryItems(): Promise<EffectTemplateWithMedia[]> {
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
      // Debug: Log the storage path to check format
      if (item.preview_media?.storage_path) {
        console.log('Storage path:', item.preview_media.storage_path)
      }
      
      return {
        id: item.id,
        name: item.name,
        prompt: item.prompt,
        category: item.category,
        preview_media: item.preview_media,
        display_order: item.display_order
      }
    })

    return transformedData
  } catch (error) {
    console.error('Gallery API error:', error)
    throw error
  }
}

export async function getCategories(): Promise<Category[]> {
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