import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/auth';
import { VideoGenerationService } from '@/lib/services/canvas/generation.service';
import { generateVideoRequestSchema } from '@/lib/services/canvas/schemas';
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
        { error: 'Login is required' },
        { status: 401 }
      );
    }
    
    // 2. 요청 데이터 검증
    const body = await request.json();
    const validated = generateVideoRequestSchema.parse(body);
    
    // 3. 서비스 실행
    const webhookBaseUrl = process.env.NEXT_PUBLIC_SITE_URL || 
                          `https://${request.headers.get('host')}`;
    const service = new VideoGenerationService(webhookBaseUrl);
    const result = await service.generateVideo(validated, user);
    
    // 4. 응답 반환
    return NextResponse.json(result);

  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { 
          error: 'Request data is invalid',
          details: error.errors 
        },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { 
        error: error instanceof Error 
          ? error.message 
          : 'Server error occurred'
      },
      { status: 500 }
    );
  }
}