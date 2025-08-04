import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

interface RouteParams {
  params: Promise<{
    jobId: string;
  }>;
}

/**
 * fal.ai API를 직접 폴링하여 상태를 확인하는 엔드포인트
 * webhook이 실패하는 경우의 백업 방안
 */
export async function GET(
  request: NextRequest,
  props: RouteParams
) {
  try {
    const params = await props.params;
    const { jobId } = params;

    if (!jobId) {
      return NextResponse.json(
        { error: 'Job ID가 필요합니다.' },
        { status: 400 }
      );
    }

    // Supabase에서 job 정보 조회
    const supabase = await createClient();
    
    const { data: job, error } = await supabase
      .from('video_generations')
      .select('*')
      .eq('job_id', jobId)
      .single();

    if (error || !job) {
      return NextResponse.json(
        { error: '작업을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 이미 완료되었거나 실패한 경우 그대로 반환
    if (job.status === 'completed' || job.status === 'failed') {
      return NextResponse.json({
        jobId: job.job_id,
        status: job.status,
        modelType: job.model_type,
        result: job.status === 'completed' ? {
          videoUrl: job.output_video_url,
          thumbnailUrl: job.input_image_url
        } : null,
        error: job.error_message,
        webhookStatus: job.webhook_status
      });
    }

    // webhook 상태 확인 (5분 타임아웃)
    const elapsedMinutes = Math.floor((Date.now() - new Date(job.created_at).getTime()) / 60000);
    
    if (job.webhook_status === 'pending' && elapsedMinutes >= 5) {
      console.log(`Webhook timeout for job ${jobId} after ${elapsedMinutes} minutes`);
      
      // Service client로 webhook_status 업데이트
      const { createServiceClient } = await import('@/lib/supabase/service');
      const serviceSupabase = createServiceClient();
      
      await serviceSupabase
        .from('video_generations')
        .update({ 
          webhook_status: 'timeout',
          updated_at: new Date().toISOString()
        })
        .eq('job_id', jobId);
    }

    // fal_request_id가 있는 경우 fal.ai API 상태 확인
    if (job.fal_request_id) {
      try {
        // 모델별 엔드포인트 설정
        const endpoint = job.model_type === 'seedance' 
          ? "fal-ai/bytedance/seedance/v1/pro/image-to-video"
          : "fal-ai/minimax/hailuo-02/standard/image-to-video";
        
        const statusUrl = `https://queue.fal.run/${endpoint}/requests/${job.fal_request_id}/status`;
        
        const response = await fetch(statusUrl, {
          headers: {
            'Authorization': `Key ${process.env.FAL_API_KEY}`
          }
        });

        if (response.ok) {
          const statusData = await response.json();
          console.log('fal.ai poll status:', statusData);

          // 완료된 경우
          if (statusData.status === 'COMPLETED') {
            const responseUrl = statusData.response_url || `https://queue.fal.run/${endpoint}/requests/${job.fal_request_id}`;
            
            // 결과 가져오기
            const resultResponse = await fetch(responseUrl, {
              headers: {
                'Authorization': `Key ${process.env.FAL_API_KEY}`
              }
            });

            if (resultResponse.ok) {
              const resultData = await resultResponse.json();
              
              // response 객체 안에 실제 결과가 있을 수 있음
              const videoUrl = resultData.video?.url || resultData.response?.video?.url;
              
              if (videoUrl) {
                // Service client로 DB 업데이트
                const { createServiceClient } = await import('@/lib/supabase/service');
                const serviceSupabase = createServiceClient();
                
                await serviceSupabase
                  .from('video_generations')
                  .update({
                    status: 'completed',
                    output_video_url: videoUrl,
                    webhook_status: job.webhook_status === 'pending' ? 'timeout' : job.webhook_status,
                    updated_at: new Date().toISOString()
                  })
                  .eq('job_id', jobId);

                return NextResponse.json({
                  jobId: job.job_id,
                  status: 'completed',
                  modelType: job.model_type,
                  result: {
                    videoUrl: videoUrl,
                    thumbnailUrl: job.input_image_url
                  },
                  webhookStatus: job.webhook_status
                });
              }
            }
          } else if (statusData.status === 'FAILED') {
            // 실패 처리
            const { createServiceClient } = await import('@/lib/supabase/service');
            const serviceSupabase = createServiceClient();
            
            await serviceSupabase
              .from('video_generations')
              .update({
                status: 'failed',
                error_message: statusData.error || 'Video generation failed',
                webhook_status: job.webhook_status === 'pending' ? 'timeout' : job.webhook_status,
                updated_at: new Date().toISOString()
              })
              .eq('job_id', jobId);

            return NextResponse.json({
              jobId: job.job_id,
              status: 'failed',
              modelType: job.model_type,
              error: statusData.error || 'Video generation failed',
              webhookStatus: job.webhook_status
            });
          } else if (statusData.status === 'IN_QUEUE') {
            return NextResponse.json({
              jobId: job.job_id,
              status: 'processing',
              modelType: job.model_type,
              progress: 25,
              queuePosition: statusData.queue_position,
              webhookStatus: job.webhook_status
            });
          } else if (statusData.status === 'IN_PROGRESS') {
            return NextResponse.json({
              jobId: job.job_id,
              status: 'processing',
              modelType: job.model_type,
              progress: 50,
              webhookStatus: job.webhook_status
            });
          }
        }
      } catch (error) {
        console.error('Error polling fal.ai:', error);
      }
    }

    // 아직 처리 중
    return NextResponse.json({
      jobId: job.job_id,
      status: job.status,
      modelType: job.model_type,
      progress: job.status === 'processing' ? 50 : 0,
      webhookStatus: job.webhook_status
    });

  } catch (error) {
    console.error('Poll error:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}