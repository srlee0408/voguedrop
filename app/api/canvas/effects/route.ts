import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

interface EffectWithRelations {
  id: number
  name: string
  category_id: number
  prompt: string
  preview_media_id: number | null
  display_order: number
  is_active: boolean
  created_at: string
  category: {
    id: number
    name: string
  }
  preview_media?: {
    storage_path: string
  }[]
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')

    if (!category || !['effect', 'camera', 'model', 'all'].includes(category)) {
      return NextResponse.json(
        { error: '유효한 카테고리를 지정해주세요.' },
        { status: 400 }
      )
    }

    // 'all' 카테고리인 경우 모든 효과를 한 번에 조회
    if (category === 'all') {
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
          created_at,
          category:categories(*),
          preview_media:media_assets(storage_path)
        `)
        .eq('is_active', true)
        .order('display_order', { ascending: true })

      if (effectsError) {
        console.error('Effects fetch error:', effectsError)
        return NextResponse.json(
          { error: '효과 목록을 불러오는데 실패했습니다.' },
          { status: 500 }
        )
      }

      // 미디어 URL 변환
      const effectsWithMedia = ((effects || []) as unknown as EffectWithRelations[]).map((effect) => {
        let previewUrl = null
        if (effect.preview_media && effect.preview_media.length > 0 && effect.preview_media[0].storage_path) {
          previewUrl = supabase.storage
            .from('media-asset')
            .getPublicUrl(effect.preview_media[0].storage_path).data.publicUrl
        }

        return {
          ...effect,
          previewUrl,
          preview_media: undefined // 클라이언트에 불필요한 정보 제거
        }
      })

      return NextResponse.json({
        effects: effectsWithMedia,
        category: 'all',
        total: effectsWithMedia.length
      })
    }

    // 특정 카테고리 조회 - join을 사용해서 한 번에 모든 데이터 가져오기
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
        created_at,
        category:categories!inner(*),
        preview_media:media_assets(storage_path)
      `)
      .eq('category.name', category)
      .eq('is_active', true)
      .order('display_order', { ascending: true })

    if (effectsError) {
      console.error('Effects fetch error:', effectsError)
      return NextResponse.json(
        { error: '효과 목록을 불러오는데 실패했습니다.' },
        { status: 500 }
      )
    }

    // 미디어 URL 변환
    const effectsWithMedia = ((effects || []) as unknown as EffectWithRelations[]).map((effect) => {
      let previewUrl = null
      if (effect.preview_media && effect.preview_media.length > 0 && effect.preview_media[0].storage_path) {
        previewUrl = supabase.storage
          .from('media-asset')
          .getPublicUrl(effect.preview_media[0].storage_path).data.publicUrl
      }

      return {
        ...effect,
        previewUrl,
        preview_media: undefined // 클라이언트에 불필요한 정보 제거
      }
    })

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