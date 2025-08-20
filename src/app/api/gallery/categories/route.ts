import { NextResponse } from 'next/server'
import { getCategories } from '@/lib/api/gallery'

/**
 * 카테고리 API
 * React Query에서 클라이언트 사이드 페칭에 사용됩니다.
 */
export async function GET() {
  try {
    const categories = await getCategories()
    
    return NextResponse.json(categories, {
      headers: {
        // 카테고리는 자주 변경되지 않으므로 더 긴 캐싱
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60',
      },
    })
  } catch (error) {
    console.error('Categories API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch categories' },
      { status: 500 }
    )
  }
}