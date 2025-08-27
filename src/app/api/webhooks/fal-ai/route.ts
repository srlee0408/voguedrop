/**
 * fal.ai Webhook Handler - AI 작업 완료 알림 처리 엔드포인트
 * 
 * 주요 역할:
 * 1. fal.ai API에서 전송하는 작업 완료 Webhook 수신
 * 2. HMAC 서명 검증으로 요청 무결성 확인
 * 3. 완료된 영상/오디오 URL을 데이터베이스에 저장
 * 4. Job 상태를 'completed' 또는 'failed'로 업데이트
 * 
 * 핵심 특징:
 * - HMAC-SHA256 서명 검증으로 보안 강화
 * - 영상 및 오디오 생성 모두 지원 (type 파라미터로 구분)
 * - 에러 상황에서도 적절한 로깅 및 상태 업데이트
 * - Supabase Storage에 결과 파일 저장 후 URL 반환
 * 
 * 주의사항:
 * - Webhook Secret은 환경 변수로 안전하게 관리
 * - 중복 Webhook 수신에 대한 멱등성 처리
 * - fal.ai 서버에서만 접근 가능하도록 IP 제한 고려
 * - 페이로드 크기 제한 및 타임아웃 설정
 */
import { NextRequest, NextResponse } from 'next/server';
// import { createClient } from '@/shared/lib/supabase/server';
import { verifyWebhookSignature, extractWebhookHeaders } from '@/lib/fal-webhook';

interface FalWebhookPayload {
  request_id: string;
  gateway_request_id: string;
  status: 'OK' | 'ERROR';
  payload?: {
    video?: {
      url: string;
    };
    audio?: {
      url: string;
    };
    seed?: number;
  };
  error?: string;
}

export async function POST(request: NextRequest) {
  // Webhook received
  
  try {
    // 1. Job ID와 타입 추출
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('jobId');
    const type = searchParams.get('type') || 'video'; // 기본값은 video
    
    if (!jobId) {
      return NextResponse.json(
        { error: 'Job ID가 필요합니다.' },
        { status: 400 }
      );
    }

    // 2. Webhook 헤더 추출
    const webhookHeaders = extractWebhookHeaders(request.headers);
    
    // Mock 모드가 아닌 경우에만 헤더 검증
    if (!webhookHeaders && process.env.NEXT_PUBLIC_MOCK_MODE !== 'true') {
      // Missing webhook headers
      return NextResponse.json(
        { error: 'Invalid webhook headers' },
        { status: 401 }
      );
    }

    // 3. 요청 본문 가져오기
    const bodyBuffer = Buffer.from(await request.arrayBuffer());
    
    // 4. 서명 검증 (프로덕션에서는 필수, Mock 모드에서는 스킵)
    if (process.env.NODE_ENV === 'production' && process.env.NEXT_PUBLIC_MOCK_MODE !== 'true' && webhookHeaders) {
      const isValid = await verifyWebhookSignature(
        webhookHeaders.requestId,
        webhookHeaders.userId,
        webhookHeaders.timestamp,
        webhookHeaders.signature,
        bodyBuffer
      );
      
      if (!isValid) {
        // Invalid webhook signature
        return NextResponse.json(
          { error: 'Invalid signature' },
          { status: 401 }
        );
      }
    }

    // 5. 요청 본문 파싱
    const body: FalWebhookPayload = JSON.parse(bodyBuffer.toString());
    
    // Processing webhook payload

    // 6. Supabase에서 job 업데이트 (Service Role 사용)
    const { createServiceClient } = await import('@/shared/lib/supabase/service');
    const supabase = createServiceClient();
    
    // 타입에 따라 다른 테이블 업데이트
    if (type === 'sound') {
      // 사운드 생성 처리
      if (body.status === 'OK' && body.payload?.audio?.url) {
        // 성공 케이스
        const { error } = await supabase
          .from('sound_generations')
          .update({
            status: 'completed',
            output_audio_url: body.payload.audio.url,
            webhook_status: 'delivered',
            webhook_delivered_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('job_id', jobId)
          .select('id, job_id')
          .single();
        
        if (error) {
          return NextResponse.json(
            { error: 'Database update failed', details: error },
            { status: 500 }
          );
        }
      } else {
        // 실패 케이스
        const errorMessage = body.error || 
                            body.payload?.toString() || 
                            'Unknown error';
        
        const { error } = await supabase
          .from('sound_generations')
          .update({
            status: 'failed',
            error_message: errorMessage,
            webhook_status: 'delivered',
            webhook_delivered_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('job_id', jobId);
        
        if (error) {
          return NextResponse.json(
            { error: 'Database update failed' },
            { status: 500 }
          );
        }
      }
    } else {
      // 비디오 생성 처리 (기존 코드)
      if (body.status === 'OK' && body.payload?.video?.url) {
        // 성공 케이스
        // Updating job with video URL
        
        const { error } = await supabase
          .from('video_generations')
          .update({
            status: 'completed',
            output_video_url: body.payload.video.url,
            webhook_status: 'delivered',
            webhook_delivered_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('job_id', jobId)
          .select('id, job_id')
          .single();
        
        if (error) {
          // Error updating successful generation
          return NextResponse.json(
            { error: 'Database update failed', details: error },
            { status: 500 }
          );
        }
        
        // Job completed successfully
      } else {
        // 실패 케이스
        const errorMessage = body.error || 
                            body.payload?.toString() || 
                            'Unknown error';
        
        const { error } = await supabase
          .from('video_generations')
          .update({
            status: 'failed',
            error_message: errorMessage,
            webhook_status: 'delivered',
            webhook_delivered_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('job_id', jobId);
        
        if (error) {
          // Error updating failed generation
          return NextResponse.json(
            { error: 'Database update failed' },
            { status: 500 }
          );
        }
        
        // Job failed
      }
    }

    // 7. 성공 응답 반환
    return NextResponse.json({ 
      success: true,
      jobId,
      status: body.status 
    });

  } catch (error) {
    // Webhook processing error
    
    // Webhook은 재시도될 수 있으므로, 5xx 에러 반환
    return NextResponse.json(
      { 
        error: error instanceof Error 
          ? error.message 
          : 'Webhook processing failed'
      },
      { status: 500 }
    );
  }
}

// OPTIONS 요청 처리 (CORS)
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, X-Fal-Webhook-Request-Id, X-Fal-Webhook-User-Id, X-Fal-Webhook-Timestamp, X-Fal-Webhook-Signature',
    },
  });
}