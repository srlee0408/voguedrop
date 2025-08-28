/**
 * Canvas Generate Async API - 비동기 AI 영상 생성 엔드포인트
 * 
 * 주요 역할:
 * 1. 업로드된 이미지와 선택된 효과로 AI 영상 생성 Job 생성
 * 2. fal.ai API를 통한 비동기 영상 처리 요청
 * 3. Job ID 기반 상태 추적 시스템 구축
 * 4. Webhook URL을 통한 완료 알림 설정
 * 
 * 핵심 특징:
 * - Job 기반 비동기 처리로 긴 처리 시간 대응
 * - Sentry 모니터링으로 에러 추적 및 성능 분석
 * - Zod 스키마 검증으로 요청 데이터 안전성 보장
 * - 사용자 인증 필수로 보안 강화
 * 
 * 주의사항:
 * - 최대 2개 효과만 선택 가능 (AI 모델 제약)
 * - 이미지 URL과 효과 ID 유효성 검사 필수
 * - Job 생성 실패 시 적절한 에러 처리
 * - Webhook 서명 검증을 위한 시크릿 관리
 */
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/shared/lib/api/auth';
import { VideoGenerationService } from '@/shared/lib/services/canvas/generation.service';
import { generateVideoRequestSchema } from '@/shared/lib/services/canvas/schemas';
import { ZodError } from 'zod';
import { ApiTracker } from '@/shared/lib/monitoring/api-tracker';
import { getErrorMessage, createUserFriendlyError } from '@/shared/lib/errors/user-friendly-errors';
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