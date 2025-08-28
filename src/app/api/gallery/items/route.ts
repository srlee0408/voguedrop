import { NextResponse } from 'next/server'
import { getGalleryItems } from '@/shared/lib/api/gallery'

/**
 * 갤러리 아이템 API
 * React Query에서 클라이언트 사이드 페칭에 사용됩니다.
 */
export async function GET() {
  try {
    const items = await getGalleryItems()
    
    return NextResponse.json(items, {
      headers: {
        // 브라우저 캐싱 설정
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=30',
      },
    })
  } catch (error) {
    console.error('Gallery items API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch gallery items' },
      { status: 500 }
    )
  }
}