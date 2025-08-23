import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/auth';
import { VideoGenerationService } from '@/lib/services/canvas/generation.service';
import { generateVideoRequestSchema } from '@/lib/services/canvas/schemas';
import { ZodError } from 'zod';
import { ApiTracker } from '@/lib/monitoring/api-tracker';
import { getErrorMessage, createUserFriendlyError } from '@/lib/errors/user-friendly-errors';
import * as Sentry from "@sentry/nextjs";

export async function POST(request: NextRequest): Promise<NextResponse> {
  return Sentry.startSpan(
    {
      op: "http.server",
      name: "POST /api/canvas/generate-async",
    },
    async () => {
      try {
        // 1. 사용자 인증 확인
        const { user, error: authError } = await requireAuth(request);
        if (authError) {
          return authError;
        }
        
        if (!user) {
          throw createUserFriendlyError('AUTH_REQUIRED', 'User authentication required');
        }
        
        // Sentry에 사용자 정보 설정
        Sentry.setUser({ id: user.id, email: user.email });
        
        // 2. 요청 데이터 검증
        const body = await request.json();
        const validated = generateVideoRequestSchema.parse(body);
        
        // 3. API 호출 추적과 함께 서비스 실행
        const result = await ApiTracker.trackApiCall(
          'video_generation',
          'generate_video_async',
          {
            userId: user.id,
            effectCount: validated.effectIds?.length,
            hasImage: !!validated.imageUrl,
            basePrompt: validated.basePrompt?.substring(0, 100), // 보안을 위해 일부만 로깅
          },
          async () => {
            const webhookBaseUrl = process.env.NEXT_PUBLIC_SITE_URL || 
                                  `https://${request.headers.get('host')}`;
            const service = new VideoGenerationService(webhookBaseUrl);
            return await service.generateVideo(validated, user);
          }
        );
        
        // 4. 성공 로그
        const { logger } = Sentry;
        logger.info('Video generation request initiated successfully', {
          user_id: user.id,
          job_count: result.jobs?.length,
          effect_count: validated.effectIds?.length,
        });
        
        // 5. 응답 반환
        return NextResponse.json(result);

      } catch (error) {
        // Sentry로 에러 캡처
        Sentry.captureException(error, {
          tags: {
            api_endpoint: '/api/canvas/generate-async',
            error_type: error instanceof ZodError ? 'validation_error' : 'server_error',
          }
        });

        if (error instanceof ZodError) {
          return NextResponse.json(
            { 
              error: getErrorMessage({ code: 'VALIDATION_ERROR' }),
              details: process.env.NODE_ENV === 'development' ? error.errors : undefined
            },
            { status: 400 }
          );
        }
        
        const userFriendlyMessage = getErrorMessage(error);
        return NextResponse.json(
          { error: userFriendlyMessage },
          { status: 500 }
        );
      }
    }
  );
}