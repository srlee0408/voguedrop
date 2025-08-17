import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { nanoid } from 'nanoid';
import { extractJobIdPrefix } from '@/lib/sound/utils';

interface GenerateFromVideoRequest {
  video_job_id: string;
  duration_seconds?: number;
}

export async function POST(request: NextRequest) {
  const isMockMode = process.env.NEXT_PUBLIC_MOCK_MODE === 'true';
  
  try {
    // 1. 사용자 인증 확인
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json(
        { error: '로그인이 필요합니다.' },
        { status: 401 }
      );
    }
    
    // 2. 요청 데이터 검증
    const body: GenerateFromVideoRequest = await request.json();
    const { video_job_id, duration_seconds } = body;
    
    if (!video_job_id) {
      return NextResponse.json(
        { error: '비디오를 선택해주세요.' },
        { status: 400 }
      );
    }
    
    const finalDuration = duration_seconds || 8;
    if (finalDuration < 1 || finalDuration > 22) {
      return NextResponse.json(
        { error: '길이는 1초에서 22초 사이여야 합니다.' },
        { status: 400 }
      );
    }
    
    // 3. 서비스 클라이언트로 민감한 정보 조회 (보안: 서버에서만 접근)
    const serviceSupabase = createServiceClient();
    
    console.log('Fetching video generation for job_id:', video_job_id, 'user_id:', user.id);
    
    // video_generations 테이블에서 프롬프트와 효과 정보 조회
    const { data: videoGeneration, error: fetchError } = await serviceSupabase
      .from('video_generations')
      .select('prompt, selected_effects, job_id')
      .eq('job_id', video_job_id)
      .eq('user_id', user.id) // 본인 영상만 조회 가능
      .single();
    
    if (fetchError || !videoGeneration) {
      console.error('Failed to fetch video generation:', {
        error: fetchError,
        job_id: video_job_id,
        user_id: user.id
      });
      return NextResponse.json(
        { error: `비디오 정보를 찾을 수 없습니다. (job_id: ${video_job_id})` },
        { status: 404 }
      );
    }
    
    console.log('Found video generation, prompt length:', videoGeneration.prompt?.length);
    
    // job_id에서 앞 5자리 추출하여 타이틀로 사용
    const titlePrefix = extractJobIdPrefix(video_job_id);
    
    // 4. 실제 비디오 프롬프트를 그대로 음악 생성에 사용 (450자 제한)
    let musicPrompt = videoGeneration.prompt;
    
    // 프롬프트가 450자를 넘으면 트림
    if (musicPrompt.length > 450) {
      // 447자로 자르고 '...' 추가 (총 450자)
      const truncated = musicPrompt.substring(0, 447);
      // 마지막 단어를 자르지 않도록 마지막 공백 위치 찾기
      const lastSpaceIndex = truncated.lastIndexOf(' ');
      
      // 공백이 있고 너무 많이 잘리지 않는다면 공백 위치에서 자르기
      if (lastSpaceIndex > 350) {
        musicPrompt = truncated.substring(0, lastSpaceIndex) + '...';
      } else {
        // 공백이 없거나 너무 많이 잘리면 그냥 447자에서 자르기
        musicPrompt = truncated + '...';
      }
      
      console.log('Trimmed video prompt from', videoGeneration.prompt.length, 'to', musicPrompt.length, 'characters');
    }
    
    // 5. Group ID 생성 (4개의 variation)
    const groupId = `group_${nanoid()}`;
    const jobIds: string[] = [];
    
    // 6. 4개의 variation DB 레코드 생성
    const insertPromises = [];
    for (let i = 1; i <= 4; i++) {
      const jobId = `job_${nanoid()}`;
      jobIds.push(jobId);
      
      insertPromises.push(
        serviceSupabase
          .from('sound_generations')
          .insert({
            job_id: jobId,
            user_id: user.id,
            prompt: musicPrompt, // 변환된 음악 프롬프트 사용 (서버에서만 보관)
            title: `${titlePrefix} - Soundtrack ${i}`, // job_id 앞 5자리로 타이틀 생성
            duration_seconds: finalDuration,
            status: 'pending',
            webhook_status: 'pending',
            generation_group_id: groupId,
            variation_number: i
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
      return NextResponse.json(
        { error: '사운드 생성 요청을 저장하는데 실패했습니다.' },
        { status: 500 }
      );
    }
    
    // 7. Mock 모드 처리
    if (isMockMode) {
      console.log('Mock mode enabled - generating video-based sounds');
      
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
      
      // Mock webhook 시뮬레이션
      const webhookBaseUrl = process.env.NEXT_PUBLIC_SITE_URL || 
                            `https://${request.headers.get('host')}`;
      
      jobIds.forEach((jobId, index) => {
        setTimeout(async () => {
          try {
            const webhookUrl = `${webhookBaseUrl}/api/webhooks/fal-ai?jobId=${jobId}&type=sound`;
            await fetch(webhookUrl, {
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
                    url: `https://v3.fal.media/files/example/mock_video_soundtrack_v${index + 1}.mp3`
                  }
                }
              })
            });
          } catch (error) {
            console.error(`Mock webhook error for job ${jobId}:`, error);
          }
        }, 3000 + (index * 1000));
      });
      
      return NextResponse.json({
        success: true,
        groupId: groupId, // 클라이언트 호환성을 위해 유지
        jobIds,
        status: 'processing',
        message: '비디오 기반 사운드트랙 생성이 시작되었습니다.'
      });
    }
    
    // 8. 실제 fal.ai API 호출
    const endpoint = "fal-ai/elevenlabs/sound-effects";
    const webhookBaseUrl = process.env.NEXT_PUBLIC_SITE_URL || 
                          `https://${request.headers.get('host')}`;
    
    const requestPayload = {
      text: musicPrompt,
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
          
          await serviceSupabase
            .from('sound_generations')
            .update({
              status: 'failed',
              error_message: errorData.detail || 'fal.ai API 호출 실패',
              updated_at: new Date().toISOString()
            })
            .eq('job_id', jobId);
          
          return { success: false, jobId, error: errorData.detail };
        }
        
        const result = await response.json();
        
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
    const successfulJobs = apiResults.filter(r => r.success);
    
    if (successfulJobs.length === 0) {
      return NextResponse.json(
        { error: '모든 사운드 생성 요청이 실패했습니다.' },
        { status: 500 }
      );
    }
    
    // 9. 클라이언트에 응답 (프롬프트 정보 제외)
    return NextResponse.json({
      success: true,
      groupId: groupId, // 클라이언트 호환성을 위해 유지 (실제로는 DB에 저장하지 않음)
      jobIds,
      successfulJobIds: successfulJobs.map(j => j.jobId),
      status: 'processing',
      message: `비디오 기반 ${successfulJobs.length}개의 사운드트랙 생성이 시작되었습니다.`
    });
    
  } catch (error) {
    console.error('Video-based sound generation error:', error);
    
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

