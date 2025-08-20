import { NextRequest, NextResponse } from 'next/server'
import { revalidateTag } from 'next/cache'

/**
 * 캐시 무효화 API
 * 관리자가 데이터를 업데이트한 후 캐시를 수동으로 무효화할 수 있습니다.
 * 
 * 사용 예시:
 * POST /api/revalidate
 * Body: { "tag": "gallery", "secret": "your-secret" }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { tag, secret } = body
    
    // 보안: 환경 변수의 시크릿과 비교하여 인증
    const revalidationSecret = process.env.REVALIDATION_SECRET
    
    // 개발 환경에서는 시크릿 체크를 건너뛸 수 있음
    if (process.env.NODE_ENV === 'production' && secret !== revalidationSecret) {
      return NextResponse.json(
        { error: 'Invalid secret' },
        { status: 401 }
      )
    }
    
    // 태그가 제공되지 않으면 에러
    if (!tag) {
      return NextResponse.json(
        { error: 'Tag is required' },
        { status: 400 }
      )
    }
    
    // 지원되는 태그 목록
    const supportedTags = ['gallery', 'effect-templates', 'categories', 'all']
    
    if (!supportedTags.includes(tag)) {
      return NextResponse.json(
        { error: `Invalid tag. Supported tags: ${supportedTags.join(', ')}` },
        { status: 400 }
      )
    }
    
    // 'all' 태그인 경우 모든 캐시 무효화
    if (tag === 'all') {
      revalidateTag('gallery')
      revalidateTag('effect-templates')
      revalidateTag('categories')
      
      return NextResponse.json({
        revalidated: true,
        tags: ['gallery', 'effect-templates', 'categories'],
        message: 'All caches have been revalidated'
      })
    }
    
    // 특정 태그만 무효화
    revalidateTag(tag)
    
    return NextResponse.json({
      revalidated: true,
      tag,
      message: `Cache with tag '${tag}' has been revalidated`
    })
    
  } catch (error) {
    console.error('Revalidation error:', error)
    return NextResponse.json(
      { error: 'Failed to revalidate cache' },
      { status: 500 }
    )
  }
}

// GET 메서드로 캐시 상태 확인 (개발용)
export async function GET() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'This endpoint is only available in development' },
      { status: 403 }
    )
  }
  
  return NextResponse.json({
    message: 'Cache revalidation API',
    supportedTags: ['gallery', 'effect-templates', 'categories', 'all'],
    usage: {
      method: 'POST',
      body: {
        tag: 'string (required)',
        secret: 'string (required in production)'
      }
    }
  })
}