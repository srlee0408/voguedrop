import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/shared/lib/supabase/server';
import type { ImageBrushRequest, ImageBrushResponse } from '@/shared/types/image-brush';

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
    if (!body.image || !body.mask) {
      return NextResponse.json(
        { error: 'Required fields missing. (image, mask)' },
        { status: 400 }
      );
    }
    
    // 4-1. 모드별 필수 필드 검증
    if (body.mode === 'flux' && !body.prompt) {
      return NextResponse.json(
        { error: 'Prompt is required for FLUX mode.' },
        { status: 400 }
      );
    }
    
    if (body.mode === 'i2i' && !body.referenceImage) {
      return NextResponse.json(
        { error: 'Reference image is required for I2I mode.' },
        { status: 400 }
      );
    }

    // 5. 프롬프트 길이 제한 (선택적)
    if (body.prompt && body.prompt.length > 500) {
      return NextResponse.json(
        { error: 'Prompt cannot exceed 500 characters.' },
        { status: 400 }
      );
    }

    // 6. 이미지 크기 검증 (Base64 크기 제한 - 약 10MB)
    const imageSize = body.image.length * 0.75; // Base64 to bytes approximation
    const maskSize = body.mask.length * 0.75;
    const referenceSize = body.referenceImage ? body.referenceImage.length * 0.75 : 0;
    const maxSize = 10 * 1024 * 1024; // 10MB
    
    if (imageSize > maxSize || maskSize > maxSize || referenceSize > maxSize) {
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

    // 8. Edge Function 호출 (타임아웃 5분으로 증가)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 300000); // 5분 타임아웃
    
    let response: Response;
    try {
      response = await fetch(edgeFunctionUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...body,
          userId: user.id,
        }),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeoutId);
    }

    // 9. 응답 처리
    let result: ImageBrushResponse;
    
    try {
      const responseText = await response.text();
      
      // 빈 응답 체크
      if (!responseText) {
        console.error('Empty response from Edge Function');
        return NextResponse.json(
          { 
            error: 'Edge Function returned empty response. The service may be temporarily unavailable.',
            success: false 
          },
          { status: 502 }
        );
      }
      
      // JSON 파싱 시도
      result = JSON.parse(responseText) as ImageBrushResponse;
      
    } catch (parseError) {
      console.error('Failed to parse Edge Function response:', parseError);
      return NextResponse.json(
        { 
          error: 'Invalid response from Edge Function. Please try again.',
          success: false 
        },
        { status: 502 }
      );
    }

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
    if (error instanceof Error && (error.name === 'AbortError' || error.name === 'TimeoutError')) {
      return NextResponse.json(
        { 
          error: 'Processing timeout. The image generation is taking longer than expected. Please try again with a simpler prompt or smaller image.',
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