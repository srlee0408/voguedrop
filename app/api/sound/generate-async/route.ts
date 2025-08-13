import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { nanoid } from 'nanoid';

interface GenerateSoundRequest {
  prompt: string;
  duration_seconds?: number;
  title?: string;
}

export async function POST(request: NextRequest) {
  const isMockMode = process.env.NEXT_PUBLIC_MOCK_MODE === 'true';
  
  try {
    // Supabase 클라이언트 생성 및 인증 확인
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json(
        { error: '로그인이 필요합니다.' },
        { status: 401 }
      );
    }
    
    // 1. 요청 데이터 검증
    const body: GenerateSoundRequest = await request.json();
    const { 
      prompt,
      duration_seconds,
      title
    } = body;
    
    const userId = user.id;
    
    if (!prompt || prompt.trim().length === 0) {
      return NextResponse.json(
        { error: '사운드 설명을 입력해주세요.' },
        { status: 400 }
      );
    }
    
    if (prompt.length > 450) {
      return NextResponse.json(
        { error: '프롬프트는 450자를 초과할 수 없습니다.' },
        { status: 400 }
      );
    }
    
    const finalDuration = duration_seconds || 5;
    if (finalDuration < 1 || finalDuration > 22) {
      return NextResponse.json(
        { error: '길이는 1초에서 22초 사이여야 합니다.' },
        { status: 400 }
      );
    }
    
    // 2. Job ID 생성
    const jobId = `job_${nanoid()}`;
    
    // 3. DB에 초기 레코드 생성
    const { error: dbError } = await supabase
      .from('sound_generations')
      .insert({
        job_id: jobId,
        user_id: userId,
        prompt: prompt.trim(),
        title: title?.trim() || null,
        duration_seconds: finalDuration,
        status: 'pending',
        webhook_status: 'pending'
      })
      .select('id, job_id, status')
      .single();
    
    if (dbError) {
      console.error('Failed to create sound generation record:', dbError);
      return NextResponse.json(
        { error: '사운드 생성 요청을 저장하는데 실패했습니다.' },
        { status: 500 }
      );
    }
    
    // 4. fal.ai에 비동기 요청 전송 (webhook URL 포함)
    const webhookBaseUrl = process.env.NEXT_PUBLIC_SITE_URL || 
                          `https://${request.headers.get('host')}`;
    const webhookUrl = `${webhookBaseUrl}/api/webhooks/fal-ai?jobId=${jobId}&type=sound`;
    
    // Mock 모드에서는 fal.ai API 호출을 건너뛰고 5초 후 자동 완료
    if (isMockMode) {
      console.log('Mock mode enabled - skipping fal.ai API call for sound generation');
      
      // 상태를 processing으로 업데이트
      const { createServiceClient } = await import('@/lib/supabase/service');
      const serviceSupabase = createServiceClient();
      
      await serviceSupabase
        .from('sound_generations')
        .update({
          status: 'processing',
          fal_request_id: `mock_${jobId}`,
          updated_at: new Date().toISOString()
        })
        .eq('job_id', jobId);
      
      // 5초 후 webhook 시뮬레이션
      setTimeout(async () => {
        try {
          const mockResponse = await fetch(webhookUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Webhook-Secret': process.env.WEBHOOK_SECRET || 'test-secret'
            },
            body: JSON.stringify({
              request_id: `mock_${jobId}`,
              gateway_request_id: 'mock-gateway-id',
              status: 'OK',
              payload: {
                audio: {
                  url: 'https://v3.fal.media/files/example/mock_sound_effect.mp3'
                }
              }
            })
          });
          
          if (!mockResponse.ok) {
            console.error('Mock webhook call failed');
          }
        } catch (error) {
          console.error('Mock webhook error:', error);
        }
      }, 5000);
      
      return NextResponse.json({
        success: true,
        jobId,
        status: 'processing',
        message: '사운드 생성이 시작되었습니다. 잠시 후 결과를 확인해주세요.'
      });
    }
    
    // 실제 fal.ai API 호출
    const endpoint = "fal-ai/elevenlabs/sound-effects";
    const queueUrl = `https://queue.fal.run/${endpoint}?fal_webhook=${encodeURIComponent(webhookUrl)}`;
    
    const requestPayload = {
      text: prompt.trim(),
      duration_seconds: finalDuration,
      prompt_influence: 0.3
    };
    
    const response = await fetch(queueUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Key ${process.env.FAL_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestPayload)
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error('fal.ai API error:', errorData);
      
      // 실패 시 DB 업데이트
      const { createServiceClient } = await import('@/lib/supabase/service');
      const serviceSupabase = createServiceClient();
      
      await serviceSupabase
        .from('sound_generations')
        .update({
          status: 'failed',
          error_message: errorData.detail || 'fal.ai API 호출 실패',
          updated_at: new Date().toISOString()
        })
        .eq('job_id', jobId);
      
      return NextResponse.json(
        { error: errorData.detail || 'fal.ai API 호출 실패' },
        { status: 500 }
      );
    }
    
    const result = await response.json();
    
    // fal request ID 저장 및 상태 업데이트 (Service Role 사용)
    const { createServiceClient } = await import('@/lib/supabase/service');
    const serviceSupabase = createServiceClient();
    
    await serviceSupabase
      .from('sound_generations')
      .update({
        fal_request_id: result.request_id,
        status: 'processing',
        updated_at: new Date().toISOString()
      })
      .eq('job_id', jobId);
    
    // 5. 클라이언트에 즉시 응답 반환
    return NextResponse.json({
      success: true,
      jobId,
      status: 'processing',
      message: '사운드 생성이 시작되었습니다. 잠시 후 결과를 확인해주세요.'
    });
    
  } catch (error) {
    console.error('Sound generation error:', error);
    
    return NextResponse.json(
      { 
        error: error instanceof Error 
          ? error.message 
          : '서버 오류가 발생했습니다.'
      },
      { status: 500 }
    );
  }
}