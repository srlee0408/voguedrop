import { NextRequest, NextResponse } from 'next/server';
// import { createClient } from '@/lib/supabase/server';
import { verifyWebhookSignature, extractWebhookHeaders } from '@/lib/fal-webhook';

interface FalWebhookPayload {
  request_id: string;
  gateway_request_id: string;
  status: 'OK' | 'ERROR';
  payload?: {
    video?: {
      url: string;
    };
    seed?: number;
  };
  error?: string;
}

export async function POST(request: NextRequest) {
  // Webhook received
  
  try {
    // 1. Job ID 추출
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('jobId');
    
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
    const { createServiceClient } = await import('@/lib/supabase/service');
    const supabase = createServiceClient();
    
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