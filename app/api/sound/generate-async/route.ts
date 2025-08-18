import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { nanoid } from 'nanoid';
import { processSoundTitle } from '@/lib/sound/utils';
import { SoundGenerationType } from '@/types/sound';

interface GenerateSoundRequest {
  prompt: string;
  duration_seconds?: number;
  title?: string;
  generation_type?: SoundGenerationType;
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
      title,
      generation_type = 'sound_effect' // 기본값은 sound_effect
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
    
    // Music 타입은 32초 고정, Sound Effect는 사용자 설정값
    const finalDuration = generation_type === 'music' 
      ? 32 
      : (duration_seconds || 5);
    
    if (generation_type === 'sound_effect' && (finalDuration < 1 || finalDuration > 22)) {
      return NextResponse.json(
        { error: '길이는 1초에서 22초 사이여야 합니다.' },
        { status: 400 }
      );
    }
    
    // 2. Group ID 생성 (4개의 variation을 그룹화)
    const groupId = `group_${nanoid()}`;
    const jobIds: string[] = [];
    
    // 3. 4개의 variation에 대한 DB 레코드 생성
    const insertPromises = [];
    for (let i = 1; i <= 4; i++) {
      const jobId = `job_${nanoid()}`;
      jobIds.push(jobId);
      
      insertPromises.push(
        supabase
          .from('sound_generations')
          .insert({
            job_id: jobId,
            user_id: userId,
            prompt: prompt.trim(),
            title: processSoundTitle(title, prompt.trim()),
            duration_seconds: finalDuration,
            status: 'pending',
            webhook_status: 'pending',
            generation_group_id: groupId,
            variation_number: i,
            generation_type: generation_type // DB에 generation_type 필드 추가
          })
          .select('id, job_id, status')
          .single()
      );
    }
    
    const insertResults = await Promise.all(insertPromises);
    
    // 에러 체크
    const failedInserts = insertResults.filter(result => result.error);
    if (failedInserts.length > 0) {
      console.error('Failed to create sound generation records:', failedInserts);
      // 더 자세한 에러 메시지 반환
      const errorDetails = failedInserts[0].error;
      console.error('Detailed error:', errorDetails);
      return NextResponse.json(
        { 
          error: '사운드 생성 요청을 저장하는데 실패했습니다.',
          details: errorDetails?.message || errorDetails
        },
        { status: 500 }
      );
    }
    
    // 4. fal.ai에 비동기 요청 전송 (4개의 variation)
    const webhookBaseUrl = process.env.NEXT_PUBLIC_SITE_URL || 
                          `https://${request.headers.get('host')}`;
    
    // Mock 모드에서는 fal.ai API 호출을 건너뛰고 5초 후 자동 완료
    if (isMockMode) {
      console.log('Mock mode enabled - generating 4 sound variations');
      
      const { createServiceClient } = await import('@/lib/supabase/service');
      const serviceSupabase = createServiceClient();
      
      // 모든 job을 processing으로 업데이트
      for (const jobId of jobIds) {
        await serviceSupabase
          .from('sound_generations')
          .update({
            status: 'processing',
            fal_request_id: `mock_${jobId}`,
            updated_at: new Date().toISOString()
          })
          .eq('job_id', jobId);
      }
      
      // 각 job에 대해 webhook 시뮬레이션 (약간의 딜레이를 두고)
      jobIds.forEach((jobId, index) => {
        setTimeout(async () => {
          try {
            const webhookUrl = `${webhookBaseUrl}/api/webhooks/fal-ai?jobId=${jobId}&type=sound`;
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
                    url: `https://v3.fal.media/files/example/mock_sound_effect_v${index + 1}.mp3`
                  }
                }
              })
            });
            
            if (!mockResponse.ok) {
              console.error(`Mock webhook call failed for job ${jobId}`);
            }
          } catch (error) {
            console.error(`Mock webhook error for job ${jobId}:`, error);
          }
        }, 3000 + (index * 1000)); // 3초부터 시작해서 1초씩 간격
      });
      
      return NextResponse.json({
        success: true,
        groupId,
        jobIds,
        status: 'processing',
        message: '4개의 사운드 variation 생성이 시작되었습니다.'
      });
    }
    
    // 실제 fal.ai API 호출 (4개의 variation 동시 생성)
    const endpoint = generation_type === 'music' 
      ? "fal-ai/lyria2" 
      : "fal-ai/elevenlabs/sound-effects";
    const { createServiceClient } = await import('@/lib/supabase/service');
    const serviceSupabase = createServiceClient();
    
    // API별로 다른 페이로드 구조
    const requestPayload = generation_type === 'music'
      ? {
          prompt: prompt.trim(),
          negative_prompt: "low quality"
        }
      : {
          text: prompt.trim(),
          duration_seconds: finalDuration,
          prompt_influence: 0.3
        };
    
    // 4개의 API 호출을 병렬로 실행
    const apiPromises = jobIds.map(async (jobId) => {
      const webhookUrl = `${webhookBaseUrl}/api/webhooks/fal-ai?jobId=${jobId}&type=sound`;
      const queueUrl = `https://queue.fal.run/${endpoint}?fal_webhook=${encodeURIComponent(webhookUrl)}`;
      
      try {
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
          console.error(`fal.ai API error for job ${jobId}:`, errorData);
          
          // 실패 시 DB 업데이트
          await serviceSupabase
            .from('sound_generations')
            .update({
              status: 'failed',
              error_message: errorData.detail || 'fal.ai API 호출 실패',
              updated_at: new Date().toISOString()
            })
            .eq('job_id', jobId);
          
          return { success: false, jobId, error: errorData.detail || 'fal.ai API 호출 실패' };
        }
        
        const result = await response.json();
        
        // fal request ID 저장 및 상태 업데이트
        await serviceSupabase
          .from('sound_generations')
          .update({
            fal_request_id: result.request_id,
            status: 'processing',
            updated_at: new Date().toISOString()
          })
          .eq('job_id', jobId);
        
        return { success: true, jobId, requestId: result.request_id };
      } catch (error) {
        console.error(`Error calling fal.ai for job ${jobId}:`, error);
        
        await serviceSupabase
          .from('sound_generations')
          .update({
            status: 'failed',
            error_message: 'API 호출 중 오류 발생',
            updated_at: new Date().toISOString()
          })
          .eq('job_id', jobId);
        
        return { success: false, jobId, error: 'API 호출 중 오류 발생' };
      }
    });
    
    const apiResults = await Promise.all(apiPromises);
    
    // 성공한 job 확인
    const successfulJobs = apiResults.filter(r => r.success);
    
    if (successfulJobs.length === 0) {
      return NextResponse.json(
        { error: '모든 사운드 생성 요청이 실패했습니다.' },
        { status: 500 }
      );
    }
    
    // 5. 클라이언트에 즉시 응답 반환
    return NextResponse.json({
      success: true,
      groupId,
      jobIds,
      successfulJobIds: successfulJobs.map(j => j.jobId),
      status: 'processing',
      message: `${successfulJobs.length}개의 사운드 variation 생성이 시작되었습니다.`
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