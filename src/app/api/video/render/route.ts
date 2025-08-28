import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/shared/lib/api/auth';
import { RenderService } from '@/shared/lib/services/video-editor/render.service';
import { renderRequestSchema, renderStatusRequestSchema } from '@/shared/lib/services/video-editor/schemas';
import { ZodError } from 'zod';

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // 1. 사용자 인증 확인
    const { user, error: authError } = await requireAuth(request);
    if (authError) {
      return authError;
    }
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 2. 요청 데이터 검증
    const body = await request.json();
    const validated = renderRequestSchema.parse(body);

    // 3. 서비스 실행
    const service = new RenderService();
    const result = await service.startRender(validated, user);

    // 4. 응답 반환
    return NextResponse.json(result);

  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { 
          error: '요청 데이터가 올바르지 않습니다.',
          details: error.errors 
        },
        { status: 400 }
      );
    }

    console.error('Render API error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to start render',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// 렌더링 상태 확인 엔드포인트
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const renderId = searchParams.get('renderId');
    const bucketName = searchParams.get('bucketName');
    
    if (!renderId) {
      return NextResponse.json(
        { error: 'renderId is required' },
        { status: 400 }
      );
    }

    // 1. 요청 데이터 검증
    const validated = renderStatusRequestSchema.parse({ 
      renderId, 
      bucketName: bucketName || undefined 
    });

    // 2. 서비스 실행
    const service = new RenderService();
    const result = await service.getRenderStatus(validated);

    // 3. 응답 반환
    return NextResponse.json(result);

  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { 
          error: '요청 데이터가 올바르지 않습니다.',
          details: error.errors 
        },
        { status: 400 }
      );
    }

    console.error('Status check error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to check render status',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}