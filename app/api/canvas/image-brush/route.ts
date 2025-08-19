import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { ImageBrushRequest, ImageBrushResponse } from '@/types/image-brush';

/**
 * Image Brush API Route
 * Proxies requests to Supabase Edge Function for AI image editing
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // 1. 인증 확인
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required.' },
        { status: 401 }
      );
    }

    // 2. 세션 토큰 가져오기
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      return NextResponse.json(
        { error: 'Invalid session.' },
        { status: 401 }
      );
    }

    // 3. 요청 본문 파싱
    const body = await request.json() as ImageBrushRequest;
    
    // 4. 필수 필드 검증
    if (!body.image || !body.mask || !body.prompt) {
      return NextResponse.json(
        { error: 'Required fields missing. (image, mask, prompt)' },
        { status: 400 }
      );
    }

    // 5. 프롬프트 길이 제한
    if (body.prompt.length > 500) {
      return NextResponse.json(
        { error: 'Prompt cannot exceed 500 characters.' },
        { status: 400 }
      );
    }

    // 6. 이미지 크기 검증 (Base64 크기 제한 - 약 10MB)
    const imageSize = body.image.length * 0.75; // Base64 to bytes approximation
    const maskSize = body.mask.length * 0.75;
    const maxSize = 10 * 1024 * 1024; // 10MB
    
    if (imageSize > maxSize || maskSize > maxSize) {
      return NextResponse.json(
        { error: 'Image size cannot exceed 10MB.' },
        { status: 400 }
      );
    }

    // 7. Edge Function URL 구성
    const functionsUrl = process.env.NEXT_PUBLIC_SUPABASE_FUNCTIONS_URL;
    if (!functionsUrl) {
      console.error('NEXT_PUBLIC_SUPABASE_FUNCTIONS_URL not configured');
      return NextResponse.json(
        { error: 'Server configuration error.' },
        { status: 500 }
      );
    }

    const edgeFunctionUrl = `${functionsUrl}/image-brush`;
    
    console.log('Calling Edge Function:', edgeFunctionUrl);

    // 8. Edge Function 호출
    const response = await fetch(edgeFunctionUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...body,
        userId: user.id,
      }),
      // 타임아웃 설정 (2분)
      signal: AbortSignal.timeout(120000),
    });

    // 9. 응답 처리
    const result = await response.json() as ImageBrushResponse;

    if (!response.ok) {
      console.error('Edge Function error:', result);
      return NextResponse.json(
        { 
          error: result.error || 'Failed to process image.',
          success: false 
        },
        { status: response.status }
      );
    }

    // 10. 성공 응답
    return NextResponse.json(result);

  } catch (error) {
    console.error('Image brush API error:', error);
    
    // 타임아웃 에러 처리
    if (error instanceof Error && error.name === 'AbortError') {
      return NextResponse.json(
        { 
          error: 'Processing timeout. Please try again.',
          success: false 
        },
        { status: 504 }
      );
    }
    
    // 일반 에러 처리
    return NextResponse.json(
      { 
        error: 'An error occurred during processing.',
        success: false 
      },
      { status: 500 }
    );
  }
}

// OPTIONS 요청 처리 (CORS)
export async function OPTIONS(): Promise<NextResponse> {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}