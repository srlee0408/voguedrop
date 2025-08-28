import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/infrastructure/supabase/server';
import type { ImageBrushRequest, ImageBrushResponse } from '@/shared/types/image-brush';
import { getErrorMessage, createUserFriendlyError } from '@/shared/lib/errors/user-friendly-errors';
import * as Sentry from "@sentry/nextjs";

/**
 * Image Brush API Route
 * Proxies requests to Supabase Edge Function for AI image editing
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  return Sentry.startSpan(
    {
      op: "http.server",
      name: "POST /api/canvas/image-brush",
    },
    async () => {
      try {
        // 1. 인증 확인
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        
        if (authError || !user) {
          throw createUserFriendlyError('AUTH_REQUIRED', 'User authentication required');
        }
        
        // Sentry에 사용자 정보 설정
        Sentry.setUser({ id: user.id, email: user.email });

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
          throw createUserFriendlyError('IMAGE_MASK_REQUIRED', 'Required fields missing (image, mask)');
        }
        
        // 4-1. 모드별 필수 필드 검증
        if (body.mode === 'flux' && !body.prompt) {
          throw createUserFriendlyError('IMAGE_PROMPT_REQUIRED', 'Prompt is required for FLUX mode');
        }
        
        if (body.mode === 'i2i' && !body.referenceImage) {
          throw createUserFriendlyError('IMAGE_REFERENCE_REQUIRED', 'Reference image is required for I2I mode');
        }

        // 5. 프롬프트 길이 제한 (선택적)
        if (body.prompt && body.prompt.length > 500) {
          throw createUserFriendlyError('IMAGE_PROMPT_TOO_LONG', 'Prompt exceeds 500 characters');
        }

        // 6. 이미지 크기 검증 (Base64 크기 제한 - 약 10MB)
        const imageSize = body.image.length * 0.75; // Base64 to bytes approximation
        const maskSize = body.mask.length * 0.75;
        const referenceSize = body.referenceImage ? body.referenceImage.length * 0.75 : 0;
        const maxSize = 10 * 1024 * 1024; // 10MB
        
        if (imageSize > maxSize || maskSize > maxSize || referenceSize > maxSize) {
          throw createUserFriendlyError('IMAGE_TOO_LARGE', 'Image size exceeds 10MB');
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

        // 10. 성공 로그
        const { logger } = Sentry;
        logger.info('Image brush processing completed successfully', {
          user_id: user.id,
          mode: body.mode,
          has_prompt: !!body.prompt,
          has_reference: !!body.referenceImage,
        });
        
        // 11. 성공 응답
        return NextResponse.json(result);

      } catch (error) {
        // Sentry로 에러 캡처
        Sentry.captureException(error, {
          tags: {
            api_endpoint: '/api/canvas/image-brush',
            error_type: error instanceof Error && (error.name === 'AbortError' || error.name === 'TimeoutError') 
              ? 'timeout_error' 
              : 'image_processing_error',
          }
        });
        
        // 타임아웃 에러 처리
        if (error instanceof Error && (error.name === 'AbortError' || error.name === 'TimeoutError')) {
          const timeoutMessage = getErrorMessage({ code: 'TIMEOUT_ERROR' });
          return NextResponse.json(
            { 
              error: timeoutMessage,
              success: false 
            },
            { status: 504 }
          );
        }
        
        // 일반 에러 처리
        const userFriendlyMessage = getErrorMessage(error);
        return NextResponse.json(
          { 
            error: userFriendlyMessage,
            success: false 
          },
          { status: 500 }
        );
      }
    }
  );
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