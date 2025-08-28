import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/infrastructure/supabase/service';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ jobId: string }> }
) {
  try {
    const params = await context.params;
    const { jobId } = params;
    
    if (!jobId) {
      return NextResponse.json(
        { error: 'Job ID가 필요합니다.' },
        { status: 400 }
      );
    }
    
    // Service Role로 DB 조회 (webhook 처리와 동일한 권한)
    const supabase = createServiceClient();
    
    // DB에서 job 정보 조회
    const { data: soundGeneration, error } = await supabase
      .from('sound_generations')
      .select('*')
      .eq('job_id', jobId)
      .single();
    
    if (error || !soundGeneration) {
      console.error('Failed to fetch sound generation:', error);
      return NextResponse.json(
        { error: '사운드 생성 정보를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }
    
    // 이미 완료된 경우 바로 반환
    if (soundGeneration.status === 'completed' || soundGeneration.status === 'failed') {
      return NextResponse.json({
        jobId: soundGeneration.job_id,
        status: soundGeneration.status,
        result: soundGeneration.status === 'completed' ? {
          audioUrl: soundGeneration.output_audio_url,
          title: soundGeneration.title,
          prompt: soundGeneration.prompt,
          duration: soundGeneration.duration_seconds
        } : undefined,
        error: soundGeneration.error_message || undefined
      });
    }
    
    // 5분 이상 경과했고 아직 webhook이 오지 않은 경우
    const createdAt = new Date(soundGeneration.created_at).getTime();
    const now = Date.now();
    const elapsedMinutes = (now - createdAt) / (1000 * 60);
    
    if (elapsedMinutes >= 5 && soundGeneration.webhook_status !== 'delivered') {
      // fal.ai에 직접 상태 확인
      if (!soundGeneration.fal_request_id) {
        return NextResponse.json({
          jobId: soundGeneration.job_id,
          status: 'processing',
          message: 'Request ID not found, waiting for webhook'
        });
      }
      
      // fal.ai status API 호출
      const statusUrl = `https://queue.fal.run/fal-ai/elevenlabs/sound-effects/requests/${soundGeneration.fal_request_id}/status`;
      
      const response = await fetch(statusUrl, {
        headers: {
          'Authorization': `Key ${process.env.FAL_API_KEY}`
        }
      });
      
      if (!response.ok) {
        console.error('Failed to fetch fal.ai status');
        return NextResponse.json({
          jobId: soundGeneration.job_id,
          status: soundGeneration.status
        });
      }
      
      const falStatus = await response.json();
      
      // fal.ai 상태가 완료된 경우
      if (falStatus.status === 'COMPLETED') {
        // 결과 가져오기
        const resultUrl = `https://queue.fal.run/fal-ai/elevenlabs/sound-effects/requests/${soundGeneration.fal_request_id}`;
        const resultResponse = await fetch(resultUrl, {
          headers: {
            'Authorization': `Key ${process.env.FAL_API_KEY}`
          }
        });
        
        if (resultResponse.ok) {
          const result = await resultResponse.json();
          
          // DB 업데이트
          const { error: updateError } = await supabase
            .from('sound_generations')
            .update({
              status: 'completed',
              output_audio_url: result.audio?.url,
              webhook_status: 'delivered',
              webhook_delivered_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('job_id', jobId);
          
          if (!updateError && result.audio?.url) {
            return NextResponse.json({
              jobId: soundGeneration.job_id,
              status: 'completed',
              result: {
                audioUrl: result.audio.url,
                title: soundGeneration.title,
                prompt: soundGeneration.prompt,
                duration: soundGeneration.duration_seconds
              }
            });
          }
        }
      } else if (falStatus.status === 'FAILED') {
        // 실패 상태 업데이트
        await supabase
          .from('sound_generations')
          .update({
            status: 'failed',
            error_message: 'Sound generation failed on fal.ai',
            webhook_status: 'failed',
            updated_at: new Date().toISOString()
          })
          .eq('job_id', jobId);
        
        return NextResponse.json({
          jobId: soundGeneration.job_id,
          status: 'failed',
          error: 'Sound generation failed'
        });
      }
    }
    
    // 기본 응답 (아직 처리 중)
    return NextResponse.json({
      jobId: soundGeneration.job_id,
      status: soundGeneration.status
    });
    
  } catch (error) {
    console.error('Error polling sound generation:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error 
          ? error.message 
          : '상태 확인 중 오류가 발생했습니다.'
      },
      { status: 500 }
    );
  }
}