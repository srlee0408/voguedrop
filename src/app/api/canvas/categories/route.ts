import { NextResponse } from 'next/server'
import { supabase } from '@/shared/lib/supabase'

export async function GET() {
  try {
    const { data: categories, error } = await supabase
      .from('categories')
      .select('id, name')
      .order('name', { ascending: true })

    if (error) {
      console.error('Categories fetch error:', error)
      return NextResponse.json(
        { error: '카테고리 목록을 불러오는데 실패했습니다.' },
        { status: 500 }
      )
    }

    const response = NextResponse.json({
      categories: categories || [],
      total: categories?.length || 0
    })

    // 카테고리 데이터는 자주 변경되지 않으므로 30분 캐싱
    response.headers.set('Cache-Control', 'public, max-age=1800, stale-while-revalidate=86400')
    
    return response

  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}