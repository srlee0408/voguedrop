import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')

    if (!category || !['effect', 'camera', 'model'].includes(category)) {
      return NextResponse.json(
        { error: '유효한 카테고리를 지정해주세요.' },
        { status: 400 }
      )
    }

    // 먼저 카테고리 ID를 조회
    const { data: categoryData, error: categoryError } = await supabase
      .from('categories')
      .select('id')
      .eq('name', category)
      .single()

    if (categoryError || !categoryData) {
      console.error('Category fetch error:', categoryError)
      return NextResponse.json(
        { error: '카테고리 정보를 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    // effect_templates 조회
    const { data: effects, error: effectsError } = await supabase
      .from('effect_templates')
      .select(`
        id,
        name,
        category_id,
        prompt,
        preview_media_id,
        display_order,
        is_active,
        created_at
      `)
      .eq('category_id', categoryData.id)
      .eq('is_active', true)
      .order('display_order', { ascending: true })

    if (effectsError) {
      console.error('Effects fetch error:', effectsError)
      return NextResponse.json(
        { error: '효과 목록을 불러오는데 실패했습니다.' },
        { status: 500 }
      )
    }

    // preview_media_id가 있는 경우 미디어 정보도 함께 조회
    const effectsWithMedia = await Promise.all(
      (effects || []).map(async (effect) => {
        if (effect.preview_media_id) {
          const { data: mediaData } = await supabase
            .from('media_assets')
            .select('storage_path')
            .eq('id', effect.preview_media_id)
            .single()

          if (mediaData) {
            const publicUrl = supabase.storage
              .from('media-asset')
              .getPublicUrl(mediaData.storage_path).data.publicUrl

            return {
              ...effect,
              previewUrl: publicUrl
            }
          }
        }
        return effect
      })
    )

    return NextResponse.json({
      effects: effectsWithMedia,
      category: category,
      total: effectsWithMedia.length
    })

  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}