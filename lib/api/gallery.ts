import { supabase } from '@/lib/supabase'
import type { CreationWithMedia, Category } from '@/types/database'

export async function getGalleryItems(): Promise<CreationWithMedia[]> {
  try {
    const { data, error } = await supabase
      .from('creations')
      .select(`
        *,
        category:categories!category_id(*),
        product:media_assets!product_id(*)
      `)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching gallery items:', error)
      throw new Error('Failed to fetch gallery items')
    }

    // Transform the data to match our CreationWithMedia interface
    const transformedData: CreationWithMedia[] = (data || []).map(item => {
      // Debug: Log the storage path to check format
      if (item.product?.storage_path) {
        console.log('Storage path:', item.product.storage_path)
      }
      
      return {
        ...item,
        category: item.category,
        product: item.product
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